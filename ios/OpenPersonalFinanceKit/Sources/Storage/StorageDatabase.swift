import Foundation
import GRDB
import Synchronization
import os

// Shared SQLite connection configured for cross-process App Group access after first unlock.
package final class StorageDatabase: Sendable {
    private static let busyTimeoutSeconds: TimeInterval = 5

    private let fileURL: URL
    private let queue = Mutex<DatabaseQueue?>(nil)

    package init(directory: AppGroupDirectory) {
        self.fileURL = directory.databaseFile
    }

    package func read<Value: Sendable>(_ operation: @Sendable (Database) throws -> Value) throws -> Value {
        let dbQueue = try openIfNeeded()
        return try dbQueue.read(operation)
    }

    package func write<Value: Sendable>(
        reason: String,
        _ operation: @escaping @Sendable (Database) throws -> Value
    ) throws -> Value {
        let dbQueue = try openIfNeeded()
        return try ExpiringActivity.perform(reason: reason) {
            try dbQueue.write(operation)
        }
    }

    func writeAsync<Value: Sendable>(
        reason: String,
        _ operation: @escaping @Sendable (Database) throws -> Value
    ) async throws -> Value {
        let dbQueue = try openIfNeeded()
        return try await ExpiringActivity.performAsync(reason: reason) {
            try dbQueue.write(operation)
        }
    }

    package func journalMode() throws -> String? {
        try read { try String.fetchOne($0, sql: "PRAGMA journal_mode") }
    }

    package func executeSQLForTesting(_ sql: String) async throws {
        try await writeAsync(reason: "StorageDatabase.testing") { db in
            try db.execute(sql: sql)
        }
    }

    package func countRowsForTesting(in table: String) throws -> Int {
        try read { try Int.fetchOne($0, sql: "SELECT COUNT(*) FROM \(table)") ?? 0 }
    }

    private func openIfNeeded() throws -> DatabaseQueue {
        if let existing = queue.withLock({ $0 }) {
            return existing
        }
        return try queue.withLock { cached in
            if let existing = cached {
                return existing
            }
            let opened = try openCoordinated()
            cached = opened
            return opened
        }
    }

    private func openCoordinated() throws -> DatabaseQueue {
        let parent = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: parent,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )

        var coordinatorError: NSError?
        var result: Result<DatabaseQueue, any Error>?
        let coordinator = NSFileCoordinator(filePresenter: nil)
        coordinator.coordinate(writingItemAt: fileURL, options: .forMerging, error: &coordinatorError) {
            coordinatedURL in
            result = Result { try openWithCorruptRecovery(at: coordinatedURL) }
        }
        if let coordinatorError {
            throw coordinatorError
        }
        guard let result else {
            throw StorageError.invalidStoredValue("Database coordination did not execute")
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
            // DELETE mode releases file locks and removes journal files on commit, avoiding -wal/-shm suspension traps.
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
        migrator.registerMigration("v1_initial_storage") { db in
            try db.create(table: "sync_lease") { table in
                table.column("id", .integer).primaryKey().check { $0 == 1 }
                table.column("owner", .text).notNull()
                table.column("expires_at", .double).notNull()
            }
            try db.create(table: "account_tokens") { table in
                table.column("account_id", .text).primaryKey()
                table.column("account_token", .blob)
                table.column("balance_token", .blob)
                table.column("transaction_token", .blob)
                table.column("pending_full_resync", .boolean).notNull().defaults(to: false)
                table.column("updated_at", .double).notNull()
            }
            try db.create(table: "schedule") { table in
                table.column("id", .integer).primaryKey().check { $0 == 1 }
                table.column("frequency", .text).notNull()
                table.column("updated_at", .double).notNull()
            }
            try db.create(table: "wake_log") { table in
                table.autoIncrementedPrimaryKey("id")
                table.column("started_at", .double).notNull()
                table.column("duration_ms", .integer).notNull()
                table.column("trigger", .text).notNull()
                table.column("data_types_json", .text).notNull()
                table.column("change_count", .integer)
                table.column("failure", .text)
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
