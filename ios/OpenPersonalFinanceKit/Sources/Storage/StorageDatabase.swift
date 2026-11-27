import Foundation
import GRDB
import Synchronization
import os

// Shared SQLite connection configured for cross-process App Group access after first unlock.
package final class StorageDatabase: Sendable {
    private static let busyTimeoutSeconds: TimeInterval = 5

    private let fileURL: URL
    private let queue = Mutex<DatabaseQueue?>(nil)
    private let suspended = Mutex(false)

    package init(directory: AppGroupDirectory) {
        self.fileURL = directory.databaseFile
    }

    func read<Value: Sendable>(_ operation: @Sendable (Database) throws -> Value) throws -> Value {
        resumeIfSuspended()
        let dbQueue = try openIfNeeded()
        do {
            return try dbQueue.read(operation)
        } catch  where Self.isCorruptDatabaseError(error) {
            let recovered = try recoverCorruptDatabase(replacing: dbQueue, reason: error)
            return try recovered.read(operation)
        }
    }

    func write<Value: Sendable>(
        reason: String,
        _ operation: @escaping @Sendable (Database) throws -> Value
    ) async throws -> Value {
        resumeIfSuspended()
        let dbQueue = try openIfNeeded()
        do {
            return try await ExpiringActivity.perform(reason: reason, onExpire: { self.markSuspended() }) {
                try dbQueue.write(operation)
            }
        } catch  where Self.isCorruptDatabaseError(error) {
            let recovered = try recoverCorruptDatabase(replacing: dbQueue, reason: error)
            return try await ExpiringActivity.perform(reason: reason, onExpire: { self.markSuspended() }) {
                try recovered.write(operation)
            }
        }
    }

    func journalMode() throws -> String? {
        try read { try String.fetchOne($0, sql: "PRAGMA journal_mode") }
    }

    private func markSuspended() {
        suspended.withLock { $0 = true }
        NotificationCenter.default.post(name: Database.suspendNotification, object: nil)
    }

    private func resumeIfSuspended() {
        let wasSuspended = suspended.withLock { flag -> Bool in
            guard flag else { return false }
            flag = false
            return true
        }
        if wasSuspended {
            NotificationCenter.default.post(name: Database.resumeNotification, object: nil)
        }
    }

    private func openIfNeeded() throws -> DatabaseQueue {
        if let existing = queue.withLock({ $0 }) {
            return existing
        }
        return try queue.withLock { cached in
            if let existing = cached {
                return existing
            }
            let opened = try coordinate { url in
                try openWithCorruptRecovery(at: url)
            }
            cached = opened
            return opened
        }
    }

    private func recoverCorruptDatabase(replacing failedQueue: DatabaseQueue, reason: any Error) throws -> DatabaseQueue
    {
        try queue.withLock { cached in
            if let existing = cached, existing !== failedQueue {
                return existing
            }
            try? failedQueue.close()
            cached = nil
            let reopened = try coordinate { url in
                Log.logger.warning(
                    "Removing corrupt SQLite store \(url.lastPathComponent, privacy: .public): \(String(describing: reason), privacy: .public)"
                )
                try Self.removeDatabaseFiles(at: url)
                return try openAndMigrate(at: url)
            }
            cached = reopened
            return reopened
        }
    }

    private func coordinate<Value>(_ body: (URL) throws -> Value) throws -> Value {
        let parent = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: parent,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )

        var coordinatorError: NSError?
        var result: Result<Value, any Error>?
        let coordinator = NSFileCoordinator(filePresenter: nil)
        coordinator.coordinate(writingItemAt: fileURL, options: .forMerging, error: &coordinatorError) {
            coordinatedURL in
            result = Result { try body(coordinatedURL) }
        }
        if let coordinatorError {
            throw coordinatorError
        }
        guard let result else {
            throw CocoaError(.fileReadUnknown)
        }
        return try result.get()
    }

    private func openWithCorruptRecovery(at url: URL) throws -> DatabaseQueue {
        do {
            return try openAndMigrate(at: url)
        } catch  where Self.isCorruptDatabaseError(error) {
            Log.logger.warning(
                "Removing corrupt SQLite store \(url.lastPathComponent, privacy: .public): \(String(describing: error), privacy: .public)"
            )
            try Self.removeDatabaseFiles(at: url)
            return try openAndMigrate(at: url)
        }
    }

    private func openAndMigrate(at url: URL) throws -> DatabaseQueue {
        var configuration = Configuration()
        configuration.busyMode = .timeout(Self.busyTimeoutSeconds)
        configuration.observesSuspensionNotifications = true
        configuration.prepareDatabase { db in
            // DELETE mode releases file locks on commit and avoids -wal/-shm suspension traps.
            if !db.configuration.readonly {
                try db.execute(sql: "PRAGMA journal_mode = DELETE")
            }
        }
        let dbQueue = try DatabaseQueue(path: url.path, configuration: configuration)
        try? FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: url.path
        )
        try Self.migrator.migrate(dbQueue)
        return dbQueue
    }

    private static var migrator: DatabaseMigrator {
        var migrator = DatabaseMigrator()
        migrator.registerMigration("v1_account_tokens") { db in
            try db.create(table: "account_tokens") { table in
                table.column("account_id", .text).primaryKey()
                table.column("account_token", .blob)
                table.column("balance_token", .blob)
                table.column("transaction_token", .blob)
                table.column("updated_at", .double).notNull()
            }
        }
        migrator.registerMigration("v2_wake_log_and_schedule") { db in
            try db.create(table: "schedule") { table in
                table.column("id", .integer).primaryKey().check(sql: "id = 1")
                table.column("frequency", .text).notNull()
                table.column("updated_at", .double).notNull()
            }
            try db.create(table: "wake_log") { table in
                table.autoIncrementedPrimaryKey("id")
                table.column("started_at", .double).notNull()
                table.column("trigger", .text).notNull()
                table.column("data_types_json", .text).notNull()
                table.column("outcome", .text).notNull()
                table.column("account_count", .integer).notNull()
                table.column("change_count", .integer).notNull()
            }
        }
        return migrator
    }

    private static func isCorruptDatabaseError(_ error: any Error) -> Bool {
        guard let dbError = error as? DatabaseError else { return false }
        return dbError.resultCode == .SQLITE_CORRUPT || dbError.resultCode == .SQLITE_NOTADB
    }

    private static func removeDatabaseFiles(at url: URL) throws {
        let paths = [url.path, "\(url.path)-journal", "\(url.path)-wal", "\(url.path)-shm"]
        for path in paths {
            do {
                try FileManager.default.removeItem(atPath: path)
            } catch CocoaError.fileNoSuchFile {
                continue
            }
        }
    }
}
