import Domain
import Foundation
import os

// The app and the extension both append, so each append holds the file lock for its read, modify and write.
package actor WakeLog: LogStoring {
    package static let capacity = 500
    private static let schemaVersion = 1

    private struct Envelope: Codable {
        let schemaVersion: Int
        let entries: [StoredEntry]
    }

    private struct StoredEntry: Codable {
        let date: Date
        let trigger: String
        let dataTypes: [String]
        let outcome: String
        let accountCount: Int
        let changeCount: Int

        init(_ entry: WakeLogEntry) {
            date = entry.date
            trigger = entry.trigger.rawValue
            dataTypes = entry.dataTypes.map(\.rawValue)
            outcome = entry.outcome.rawValue
            accountCount = entry.accountCount
            changeCount = entry.changeCount
        }

        func toDomain() throws -> WakeLogEntry {
            WakeLogEntry(
                date: date,
                trigger: try Self.value(trigger),
                dataTypes: try dataTypes.map(Self.value),
                outcome: try Self.value(outcome),
                accountCount: accountCount,
                changeCount: changeCount
            )
        }

        private static func value<Value: RawRepresentable>(_ raw: String) throws -> Value
        where Value.RawValue == String {
            guard let value = Value(rawValue: raw) else {
                throw DecodingError.dataCorrupted(
                    DecodingError.Context(codingPath: [], debugDescription: "Unknown value \(raw)")
                )
            }
            return value
        }
    }

    private struct VersionProbe: Decodable {
        let schemaVersion: Int
    }

    private let file: URL
    private let lock: FileLock
    private let lockWait: Duration

    package init(directory: AppGroupDirectory, lockWait: Duration = .seconds(5)) {
        file = directory.wakeLogFile
        lock = FileLock(file: directory.wakeLogLockFile)
        self.lockWait = lockWait
    }

    // Keeps the newest entries once the log is full.
    package func append(_ entry: WakeLogEntry) async throws {
        let lease = try await lock.acquire(waitingUpTo: lockWait)
        defer { lock.release(lease) }
        let entries = try load() + [entry]
        try write(Array(entries.suffix(Self.capacity)))
    }

    package func entries() throws -> [WakeLogEntry] {
        try load()
    }

    // A corrupt or incompatible file reads as empty, and the next append replaces it with a fresh one.
    // A file that can't be read throws, so an append never overwrites entries it couldn't see.
    private func load() throws -> [WakeLogEntry] {
        let data: Data
        do {
            data = try Data(contentsOf: file)
        } catch CocoaError.fileReadNoSuchFile {
            return []
        }
        do {
            let version = try JSONDecoder().decode(VersionProbe.self, from: data).schemaVersion
            guard version == Self.schemaVersion else {
                Log.logger.warning("Replacing wake log with schemaVersion \(version, privacy: .public)")
                return []
            }
            return try JSONDecoder().decode(Envelope.self, from: data).entries.map { try $0.toDomain() }
        } catch let error as DecodingError {
            Log.logger.warning("Replacing corrupt wake log: \(String(describing: error), privacy: .public)")
            return []
        }
    }

    private func write(_ entries: [WakeLogEntry]) throws {
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        let envelope = Envelope(schemaVersion: Self.schemaVersion, entries: entries.map(StoredEntry.init))
        try JSONEncoder().encode(envelope).write(to: file, options: .atomic)
    }
}
