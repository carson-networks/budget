import CoreData
import Foundation
import Synchronization
import os

// Shared NSPersistentContainer configured for App Group access after first unlock, history tracking, and remote changes.
package final class StorageContainer: Sendable {
    package enum MergePolicy: Sendable {
        case error
        case mergeByPropertyObjectTrump
    }

    private let storeURL: URL
    private let container = Mutex<NSPersistentContainer?>(nil)

    package init(directory: AppGroupDirectory) {
        self.storeURL = directory.storeFile
    }

    package func read<Value: Sendable>(
        _ operation: @Sendable (NSManagedObjectContext) throws -> Value
    ) throws -> Value {
        try perform(readOnly: true, mergePolicy: .error, operation)
    }

    package func write<Value: Sendable>(
        reason: String,
        mergePolicy: MergePolicy = .error,
        _ operation: @escaping @Sendable (NSManagedObjectContext) throws -> Value
    ) throws -> Value {
        try ExpiringActivity.perform(reason: reason) {
            try self.perform(readOnly: false, mergePolicy: mergePolicy, operation)
        }
    }

    package func writeAsync<Value: Sendable>(
        reason: String,
        mergePolicy: MergePolicy = .error,
        _ operation: @escaping @Sendable (NSManagedObjectContext) throws -> Value
    ) async throws -> Value {
        try await ExpiringActivity.performAsync(reason: reason) {
            try self.perform(readOnly: false, mergePolicy: mergePolicy, operation)
        }
    }

    // Exposes NSPersistentHistoryTracking transactions recorded by all processes sharing the store.
    package func persistentHistoryTransactionCount() throws -> Int {
        try read { context in
            let request = NSPersistentHistoryChangeRequest.fetchHistory(after: Date.distantPast)
            guard let result = try context.execute(request) as? NSPersistentHistoryResult,
                let transactions = result.result as? [NSPersistentHistoryTransaction]
            else {
                return 0
            }
            return transactions.count
        }
    }

    // Ensures the persistent store is loaded so this process receives cross-process NSPersistentStoreRemoteChange posts.
    package func prepareStore() throws {
        _ = try read { _ in () }
    }

    package func remoteChanges() -> AsyncStream<Data?> {
        let targetURL = storeURL.standardizedFileURL
        return AsyncStream { continuation in
            let task = Task {
                for await notification in NotificationCenter.default.notifications(
                    named: .NSPersistentStoreRemoteChange
                ) {
                    guard let changedURL = notification.userInfo?[NSPersistentStoreURLKey] as? URL,
                        changedURL.standardizedFileURL == targetURL
                    else {
                        continue
                    }
                    let tokenData: Data?
                    if let token = notification.userInfo?[NSPersistentHistoryTokenKey] as? NSPersistentHistoryToken {
                        tokenData = try? NSKeyedArchiver.archivedData(
                            withRootObject: token,
                            requiringSecureCoding: true
                        )
                    } else {
                        tokenData = nil
                    }
                    continuation.yield(tokenData)
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func perform<Value: Sendable>(
        readOnly: Bool,
        mergePolicy: MergePolicy,
        _ operation: @Sendable (NSManagedObjectContext) throws -> Value
    ) throws -> Value {
        try container.withLock { cached in
            let persistentContainer: NSPersistentContainer
            if let existing = cached {
                persistentContainer = existing
            } else {
                let opened = try openCoordinated()
                cached = opened
                persistentContainer = opened
            }
            let context = persistentContainer.newBackgroundContext()
            context.stalenessInterval = 0
            context.automaticallyMergesChangesFromParent = false
            if !readOnly {
                context.mergePolicy =
                    switch mergePolicy {
                    case .error: NSMergePolicy.error
                    case .mergeByPropertyObjectTrump: NSMergePolicy.mergeByPropertyObjectTrump
                    }
            }
            return try context.performAndWait {
                try operation(context)
            }
        }
    }

    private func openCoordinated() throws -> NSPersistentContainer {
        let parent = storeURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: parent,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )

        var coordinatorError: NSError?
        var result: Result<NSPersistentContainer, any Error>?
        let coordinator = NSFileCoordinator(filePresenter: nil)
        coordinator.coordinate(writingItemAt: storeURL, options: .forMerging, error: &coordinatorError) {
            coordinatedURL in
            result = Result { try openWithCorruptRecovery(at: coordinatedURL) }
        }
        if let coordinatorError {
            throw coordinatorError
        }
        guard let result else {
            throw StorageError.invalidStoredValue("Core Data store coordination did not execute")
        }
        return try result.get()
    }

    private func openWithCorruptRecovery(at url: URL) throws -> NSPersistentContainer {
        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), isDirectory.boolValue {
            throw CocoaError(.fileReadUnknown)
        }
        do {
            return try loadContainer(at: url)
        } catch  where Self.isCorruptStoreError(error) {
            Log.logger.warning(
                "Removing corrupt Core Data store \(url.lastPathComponent, privacy: .public): \(String(describing: error), privacy: .public)"
            )
            try Self.removeStoreFiles(at: url)
            return try loadContainer(at: url)
        }
    }

    private func loadContainer(at url: URL) throws -> NSPersistentContainer {
        let persistentContainer = NSPersistentContainer(
            name: "OpenPersonalFinanceStorage",
            managedObjectModel: StorageModel.make()
        )
        let description = NSPersistentStoreDescription(url: url)
        description.type = NSSQLiteStoreType
        description.shouldMigrateStoreAutomatically = true
        description.shouldInferMappingModelAutomatically = true
        description.setOption(
            FileProtectionType.completeUntilFirstUserAuthentication as NSObject,
            forKey: NSPersistentStoreFileProtectionKey
        )
        description.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        description.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        // DELETE mode releases file locks and deletes journal files on commit to avoid 0xdead10cc suspension traps.
        description.setOption(
            ["journal_mode": "DELETE", "busy_timeout": "5000"] as NSDictionary,
            forKey: NSSQLitePragmasOption
        )
        persistentContainer.persistentStoreDescriptions = [description]

        let loadError = Mutex<(any Error)?>(nil)
        persistentContainer.loadPersistentStores { _, error in
            if let error {
                loadError.withLock { $0 = error }
            }
        }
        if let error = loadError.withLock({ $0 }) {
            throw error
        }
        return persistentContainer
    }

    private static func isCorruptStoreError(_ error: any Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == NSSQLiteErrorDomain, nsError.code == 11 || nsError.code == 26 {
            return true
        }
        if let sqliteCode = (nsError.userInfo[NSSQLiteErrorDomain] as? NSNumber)?.intValue,
            sqliteCode == 11 || sqliteCode == 26
        {
            return true
        }
        if nsError.domain == NSCocoaErrorDomain {
            switch nsError.code {
            case NSFileReadCorruptFileError, NSPersistentStoreIncompatibleVersionHashError, NSMigrationError:
                return true
            case NSPersistentStoreOpenError, NSSQLiteError:
                if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? NSError {
                    return isCorruptStoreError(underlying)
                }
                return true
            default:
                break
            }
        }
        if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? NSError {
            return isCorruptStoreError(underlying)
        }
        return false
    }

    private static func removeStoreFiles(at url: URL) throws {
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
