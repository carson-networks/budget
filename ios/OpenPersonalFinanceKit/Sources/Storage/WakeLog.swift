import Domain
import Foundation
import GRDB
import os

// Shared by the app and the extension via SQLite transactions, eliminating lock files and sleep retries.
package actor WakeLog: LogStoring {
    package static let capacity = 500

    private struct WakeLogRow: FetchableRecord, Sendable {
        let startedAt: Double
        let durationMilliseconds: Int
        let trigger: String
        let dataTypesJSON: String
        let changeCount: Int?
        let failure: String?

        init(row: Row) {
            startedAt = row["started_at"]
            durationMilliseconds = row["duration_ms"]
            trigger = row["trigger"]
            dataTypesJSON = row["data_types_json"]
            changeCount = row["change_count"]
            failure = row["failure"]
        }

        func toDomain() throws -> WakeLogEntry {
            let outcome: WakeLogEntry.Outcome
            switch (changeCount, failure) {
            case (let count?, nil):
                outcome = .succeeded(changeCount: count)
            case (nil, let reason?):
                outcome = .failed(try Self.enumValue(reason))
            default:
                throw StorageError.invalidStoredValue("Outcome needs exactly one of changeCount and failure")
            }
            let rawTypes = try JSONDecoder().decode([String].self, from: Data(dataTypesJSON.utf8))
            return WakeLogEntry(
                startedAt: Date(timeIntervalSince1970: startedAt),
                duration: .milliseconds(durationMilliseconds),
                trigger: try Self.enumValue(trigger),
                dataTypes: try rawTypes.map { try Self.enumValue($0) },
                outcome: outcome
            )
        }

        private static func enumValue<Value: RawRepresentable<String>>(_ raw: String) throws -> Value {
            guard let value = Value(rawValue: raw) else {
                throw StorageError.invalidStoredValue("Unknown \(Value.self): \(raw)")
            }
            return value
        }
    }

    private let database: StorageDatabase

    package init(database: StorageDatabase) {
        self.database = database
    }

    package init(directory: AppGroupDirectory) {
        self.init(database: StorageDatabase(directory: directory))
    }

    package func append(_ entry: WakeLogEntry) async throws {
        let startedAt = entry.startedAt.timeIntervalSince1970
        let durationMilliseconds = Int((entry.duration / .milliseconds(1)).rounded())
        let trigger = entry.trigger.rawValue
        let dataTypesData = try JSONEncoder().encode(entry.dataTypes.map(\.rawValue))
        guard let dataTypesJSON = String(data: dataTypesData, encoding: .utf8) else {
            throw StorageError.invalidStoredValue("Failed to encode data types as UTF-8")
        }
        let (changeCount, failure): (Int?, String?) =
            switch entry.outcome {
            case .succeeded(let count): (count, nil)
            case .failed(let reason): (nil, reason.rawValue)
            }

        try await database.writeAsync(reason: "WakeLog.append") { db in
            try db.execute(
                sql: """
                    INSERT INTO wake_log (started_at, duration_ms, trigger, data_types_json, change_count, failure)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                arguments: [startedAt, durationMilliseconds, trigger, dataTypesJSON, changeCount, failure]
            )
            try db.execute(
                sql: """
                    DELETE FROM wake_log
                    WHERE id NOT IN (
                        SELECT id FROM wake_log ORDER BY id DESC LIMIT ?
                    )
                    """,
                arguments: [Self.capacity]
            )
        }
    }

    package func entries() async throws -> [WakeLogEntry] {
        let rows = try database.read { db in
            try WakeLogRow.fetchAll(
                db,
                sql: """
                    SELECT started_at, duration_ms, trigger, data_types_json, change_count, failure
                    FROM wake_log
                    ORDER BY id ASC
                    """
            )
        }
        do {
            return try rows.map { try $0.toDomain() }
        } catch {
            Log.logger.warning("Clearing an unreadable wake log: \(String(describing: error), privacy: .public)")
            try await database.writeAsync(reason: "WakeLog.wipeCorrupt") { db in
                try db.execute(sql: "DELETE FROM wake_log")
            }
            return []
        }
    }
}
