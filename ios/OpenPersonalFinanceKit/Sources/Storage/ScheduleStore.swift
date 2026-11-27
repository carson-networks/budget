import Domain
import Foundation
import GRDB
import os

package actor ScheduleStore: ScheduleStoring {
    private let database: StorageDatabase

    package init(database: StorageDatabase) {
        self.database = database
    }

    package init(directory: AppGroupDirectory) {
        self.init(database: StorageDatabase(directory: directory))
    }

    package func frequency() throws -> SyncFrequency? {
        let raw = try database.read { db in
            try String.fetchOne(db, sql: "SELECT frequency FROM schedule WHERE id = 1")
        }
        guard let raw else { return nil }
        guard let frequency = SyncFrequency(rawValue: raw) else {
            Log.logger.warning("Ignoring malformed schedule frequency: \(raw, privacy: .public)")
            return nil
        }
        return frequency
    }

    package func save(_ frequency: SyncFrequency) async throws {
        let updatedAt = Date().timeIntervalSince1970
        try await database.write(reason: "ScheduleStore.save") { db in
            try db.execute(
                sql: """
                    INSERT INTO schedule (id, frequency, updated_at)
                    VALUES (1, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        frequency = excluded.frequency,
                        updated_at = excluded.updated_at
                    """,
                arguments: [frequency.rawValue, updatedAt]
            )
        }
    }
}
