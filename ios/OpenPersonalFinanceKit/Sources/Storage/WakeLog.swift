import Domain
import Foundation
import os

// Shared by the app and the extension, so every append is a locked read-modify-write of the file.
package actor WakeLog: LogStoring {
    package static let capacity = 500
    private static let lockAttempts = 40
    private static let lockRetryDelay = Duration.milliseconds(25)

    private struct Envelope: VersionedEnvelope {
        static let currentVersion = 1
        let schemaVersion: Int
        let entries: [StoredEntry]
    }

    // The file's own shape; exactly one of `changeCount` and `failure` is set.
    private struct StoredEntry: Codable {
        let startedAt: Date
        let durationMilliseconds: Int
        let trigger: String
        let dataTypes: [String]
        let changeCount: Int?
        let failure: String?

        init(_ entry: WakeLogEntry) {
            startedAt = entry.startedAt
            durationMilliseconds = Int((entry.duration / .milliseconds(1)).rounded())
            trigger = entry.trigger.rawValue
            dataTypes = entry.dataTypes.map(\.rawValue)
            switch entry.outcome {
            case .succeeded(let count):
                changeCount = count
                failure = nil
            case .failed(let reason):
                changeCount = nil
                failure = reason.rawValue
            }
        }

        func toDomain() throws -> WakeLogEntry {
            let outcome: WakeLogEntry.Outcome
            switch (changeCount, failure) {
            case (let count?, nil):
                outcome = .succeeded(changeCount: count)
            case (nil, let failure?):
                outcome = .failed(try Self.value(failure))
            default:
                throw Self.invalid("Outcome needs exactly one of changeCount and failure")
            }
            return WakeLogEntry(
                startedAt: startedAt,
                duration: .milliseconds(durationMilliseconds),
                trigger: try Self.value(trigger),
                dataTypes: try dataTypes.map { try Self.value($0) },
                outcome: outcome
            )
        }

        private static func value<Value: RawRepresentable<String>>(_ raw: String) throws -> Value {
            guard let value = Value(rawValue: raw) else {
                throw invalid("Unknown \(Value.self) \(raw)")
            }
            return value
        }

        private static func invalid(_ description: String) -> DecodingError {
            DecodingError.dataCorrupted(DecodingError.Context(codingPath: [], debugDescription: description))
        }
    }

    private let file: VersionedFile<Envelope>
    private let lock: FileLock

    package init(directory: AppGroupDirectory) {
        file = VersionedFile(url: directory.wakeLogFile)
        lock = FileLock(url: directory.wakeLogLockFile)
    }

    // Waits briefly for the other process rather than dropping the entry.
    package func append(_ entry: WakeLogEntry) async throws {
        let lease = try await acquireLock()
        defer {
            do {
                try lock.release(lease)
            } catch {
                Log.logger.error("Releasing the wake log lock failed: \(String(describing: error), privacy: .public)")
            }
        }
        let entries = try load() + [entry]
        try file.write(
            Envelope(
                schemaVersion: Envelope.currentVersion,
                entries: entries.suffix(Self.capacity).map(StoredEntry.init)
            )
        )
    }

    package func entries() throws -> [WakeLogEntry] {
        try load()
    }

    private func load() throws -> [WakeLogEntry] {
        guard let envelope = try file.read() else { return [] }
        do {
            return try envelope.entries.map { try $0.toDomain() }
        } catch let error as DecodingError {
            Log.logger.warning("Clearing an unreadable wake log: \(String(describing: error), privacy: .public)")
            try file.remove()
            return []
        }
    }

    private func acquireLock() async throws -> FileLock.Lease {
        for _ in 0..<Self.lockAttempts {
            if let lease = try lock.tryAcquire() {
                return lease
            }
            try await Task.sleep(for: Self.lockRetryDelay)
        }
        throw StorageError.lockBusy
    }
}
