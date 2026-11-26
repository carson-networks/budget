import Foundation
import SwiftData
import Synchronization
import os

@ModelActor
actor StorageModelWorker {
    // Creates a fresh ModelContext per call so cross-process writes on disk are never masked by cached snapshots.
    func read<Value: Sendable>(_ operation: @Sendable (ModelContext) throws -> Value) throws -> Value {
        let context = ModelContext(modelContainer)
        context.autosaveEnabled = false
        return try operation(context)
    }
}

// Shared SwiftData ModelContainer configured for App Group access after first unlock.
package final class StorageContainer: Sendable {
    private struct Loaded: Sendable {
        let container: ModelContainer
        let worker: StorageModelWorker
    }

    private let storeURL: URL
    private let state = Mutex<Loaded?>(nil)

    package init(directory: AppGroupDirectory) {
        self.storeURL = directory.storeFile
    }

    func read<Value: Sendable>(_ operation: @Sendable (ModelContext) throws -> Value) async throws -> Value {
        let loaded = try openIfNeeded()
        return try await loaded.worker.read(operation)
    }

    func readSync<Value: Sendable>(_ operation: @Sendable (ModelContext) throws -> Value) throws -> Value {
        let loaded = try openIfNeeded()
        let context = ModelContext(loaded.container)
        context.autosaveEnabled = false
        return try operation(context)
    }

    // Coordinates cross-process writes via NSFileCoordinator because SwiftData hides SQLite busy_timeout and NSErrorMergePolicy.
    func writeSync<Value: Sendable>(
        reason: String,
        _ operation: @escaping @Sendable (ModelContext) throws -> Value
    ) throws -> Value {
        let loaded = try openIfNeeded()
        let url = storeURL
        return try ExpiringActivity.perform(reason: reason) {
            try Self.coordinateWrite(at: url, in: loaded.container, operation)
        }
    }

    func writeAsync<Value: Sendable>(
        reason: String,
        _ operation: @escaping @Sendable (ModelContext) throws -> Value
    ) async throws -> Value {
        let loaded = try openIfNeeded()
        let url = storeURL
        return try await ExpiringActivity.performAsync(reason: reason) {
            try Self.coordinateWrite(at: url, in: loaded.container, operation)
        }
    }

    private static func coordinateWrite<Value: Sendable>(
        at url: URL,
        in container: ModelContainer,
        _ operation: @Sendable (ModelContext) throws -> Value
    ) throws -> Value {
        var coordinatorError: NSError?
        var outcome: Result<Value, any Error>?
        let coordinator = NSFileCoordinator(filePresenter: nil)
        coordinator.coordinate(writingItemAt: url, options: .forMerging, error: &coordinatorError) { _ in
            outcome = Result {
                let context = ModelContext(container)
                context.autosaveEnabled = false
                return try operation(context)
            }
        }
        if let coordinatorError {
            throw coordinatorError
        }
        guard let outcome else {
            throw StorageError.invalidStoredValue("SwiftData write coordination did not execute")
        }
        return try outcome.get()
    }

    package func historyTransactionCount() throws -> Int {
        try readSync { context in
            try context.fetchHistory(HistoryDescriptor<DefaultHistoryTransaction>()).count
        }
    }

    package func corruptScheduleForTesting() async throws {
        try await writeAsync(reason: "StorageContainer.corruptScheduleForTesting") { context in
            let key = 1
            let descriptor = FetchDescriptor<StoredSchedule>(predicate: #Predicate { $0.key == key })
            if let existing = try context.fetch(descriptor).first {
                existing.frequency = "fortnightly"
                try context.save()
            }
        }
    }

    package func scheduleRowCountForTesting() throws -> Int {
        try readSync { context in
            try context.fetchCount(FetchDescriptor<StoredSchedule>())
        }
    }

    package func insertCorruptWakeLogRowForTesting(
        trigger: String,
        dataTypesJSON: String,
        changeCount: Int64?,
        failure: String?
    ) async throws {
        try await writeAsync(reason: "StorageContainer.insertCorruptWakeLogRowForTesting") { context in
            context.insert(
                StoredWakeLogEntry(
                    sequence: 999,
                    startedAt: Date(timeIntervalSince1970: 0),
                    durationMilliseconds: 1,
                    trigger: trigger,
                    dataTypesJSON: dataTypesJSON,
                    changeCount: changeCount,
                    failure: failure
                )
            )
            try context.save()
        }
    }

    private func openIfNeeded() throws -> Loaded {
        if let existing = state.withLock({ $0 }) {
            return existing
        }
        return try state.withLock { cached in
            if let existing = cached {
                return existing
            }
            let container = try openCoordinated()
            let loaded = Loaded(container: container, worker: StorageModelWorker(modelContainer: container))
            cached = loaded
            return loaded
        }
    }

    private func openCoordinated() throws -> ModelContainer {
        let parent = storeURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: parent,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )

        var coordinatorError: NSError?
        var result: Result<ModelContainer, any Error>?
        let coordinator = NSFileCoordinator(filePresenter: nil)
        coordinator.coordinate(writingItemAt: storeURL, options: .forMerging, error: &coordinatorError) {
            coordinatedURL in
            result = Result { try openWithCorruptRecovery(at: coordinatedURL) }
        }
        if let coordinatorError {
            throw coordinatorError
        }
        guard let result else {
            throw StorageError.invalidStoredValue("SwiftData store coordination did not execute")
        }
        return try result.get()
    }

    private func openWithCorruptRecovery(at url: URL) throws -> ModelContainer {
        var isDirectory: ObjCBool = false
        let existedBeforeOpen = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
        if existedBeforeOpen, isDirectory.boolValue {
            throw CocoaError(.fileReadUnknown)
        }
        do {
            return try makeContainer(at: url)
        } catch  where existedBeforeOpen && FileManager.default.isReadableFile(atPath: url.path) {
            Log.logger.warning(
                "Removing corrupt SwiftData store \(url.lastPathComponent, privacy: .public): \(String(describing: error), privacy: .public)"
            )
            try Self.removeStoreFiles(at: url)
            return try makeContainer(at: url)
        }
    }

    private func makeContainer(at url: URL) throws -> ModelContainer {
        let schema = Schema([
            StoredSyncLease.self,
            StoredToken.self,
            StoredSchedule.self,
            StoredWakeLogEntry.self,
        ])
        let configuration = ModelConfiguration(
            "OpenPersonalFinanceStorage",
            schema: schema,
            url: url,
            allowsSave: true,
            cloudKitDatabase: .none
        )
        let container = try ModelContainer(for: schema, configurations: [configuration])
        Self.applyFileProtection(to: url)
        return container
    }

    private static func applyFileProtection(to url: URL) {
        let paths = [url.path, "\(url.path)-wal", "\(url.path)-shm", "\(url.path)-journal"]
        for path in paths where FileManager.default.fileExists(atPath: path) {
            try? FileManager.default.setAttributes(
                [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                ofItemAtPath: path
            )
        }
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
