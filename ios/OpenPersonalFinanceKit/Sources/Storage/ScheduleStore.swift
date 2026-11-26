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

    // An unknown frequency is cleared, so the choice falls back to the default until it is picked again.
    package func frequency() async throws -> SyncFrequency? {
        guard
            let stored = try database.read({ db in
                try String.fetchOne(db, sql: "SELECT frequency FROM schedule WHERE id = 1")
            })
        else {
            return nil
        }
        guard let frequency = SyncFrequency(rawValue: stored) else {
            Log.logger.warning("Clearing an unknown sync frequency: \(stored, privacy: .public)")
            try await database.writeAsync(reason: "ScheduleStore.clearUnknown") { db in
                try db.execute(sql: "DELETE FROM schedule WHERE id = 1")
            }
            return nil
        }
        return frequency
    }

    package func save(_ frequency: SyncFrequency) async throws {
        let updatedAt = Date().timeIntervalSince1970
        try await database.writeAsync(reason: "ScheduleStore.save") { db in
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
