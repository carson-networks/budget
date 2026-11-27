import Domain
import Foundation
import GRDB
import os

// Appends and trims in one SQLite write transaction so app and extension writes serialize without a lock file.
package actor WakeLog: LogStoring {
    package static let capacity = 500

    private struct WakeRow: FetchableRecord, Sendable {
        let id: Int64
        let startedAt: Double
        let trigger: String
        let dataTypesJSON: String
        let outcome: String
        let accountCount: Int
        let changeCount: Int

        init(row: Row) {
            id = row["id"]
            startedAt = row["started_at"]
            trigger = row["trigger"]
            dataTypesJSON = row["data_types_json"]
            outcome = row["outcome"]
            accountCount = row["account_count"]
            changeCount = row["change_count"]
        }

        func toDomain() -> WakeLogEntry? {
            guard let trigger = SyncTrigger(rawValue: trigger),
                let outcome = WakeLogEntry.Outcome(rawValue: outcome),
                let rawTypes = try? JSONDecoder().decode([String].self, from: Data(dataTypesJSON.utf8))
            else {
                return nil
            }
            var dataTypes: [WalletDataType] = []
            dataTypes.reserveCapacity(rawTypes.count)
            for rawType in rawTypes {
                guard let dataType = WalletDataType(rawValue: rawType) else { return nil }
                dataTypes.append(dataType)
            }
            return WakeLogEntry(
                date: Date(timeIntervalSince1970: startedAt),
                trigger: trigger,
                dataTypes: dataTypes,
                outcome: outcome,
                accountCount: accountCount,
                changeCount: changeCount
            )
        }
    }

    private let database: StorageDatabase

    package init(database: StorageDatabase) {
        self.database = database
    }

    package init(directory: AppGroupDirectory) {
        self.init(database: StorageDatabase(directory: directory))
    }

    // Keeps the newest entries once the log is full.
    package func append(_ entry: WakeLogEntry) async throws {
        let dataTypesData = try JSONEncoder().encode(entry.dataTypes.map(\.rawValue))
        guard let dataTypesJSON = String(data: dataTypesData, encoding: .utf8) else {
            throw CocoaError(.fileWriteInapplicableStringEncoding)
        }
        let startedAt = entry.date.timeIntervalSince1970
        let trigger = entry.trigger.rawValue
        let outcome = entry.outcome.rawValue
        let accountCount = entry.accountCount
        let changeCount = entry.changeCount
        let capacity = Self.capacity

        try await database.write(reason: "WakeLog.append") { db in
            try db.execute(
                sql: """
                    INSERT INTO wake_log (
                        started_at, trigger, data_types_json, outcome, account_count, change_count
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                arguments: [startedAt, trigger, dataTypesJSON, outcome, accountCount, changeCount]
            )
            try db.execute(
                sql: """
                    DELETE FROM wake_log
                    WHERE id NOT IN (
                        SELECT id FROM wake_log ORDER BY id DESC LIMIT ?
                    )
                    """,
                arguments: [capacity]
            )
        }
    }

    package func entries() throws -> [WakeLogEntry] {
        let rows = try database.read { db in
            try WakeRow.fetchAll(
                db,
                sql: """
                    SELECT id, started_at, trigger, data_types_json, outcome, account_count, change_count
                    FROM wake_log
                    ORDER BY id ASC
                    """
            )
        }
        return rows.compactMap { row in
            guard let entry = row.toDomain() else {
                Log.logger.warning("Skipping malformed wake log row \(row.id, privacy: .public)")
                return nil
            }
            return entry
        }
    }
}
