import Domain
import Foundation
import Storage
import Testing

struct ScheduleStoreTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)

    private func store() -> ScheduleStore {
        ScheduleStore(directory: AppGroupDirectory(url: directory))
    }

    @Test func startsUnset() async throws {
        #expect(try await store().frequency() == nil)
    }

    @Test(arguments: SyncFrequency.allCases)
    func savesAndSurvivesANewInstance(frequency: SyncFrequency) async throws {
        try await store().save(frequency)
        #expect(try await store().frequency() == frequency)
    }

    @Test func clearsAnUnknownStoredFrequency() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let db = StorageDatabase(directory: appGroup)
        let schedule = ScheduleStore(database: db)
        try await schedule.save(.daily)

        try await db.executeSQLForTesting("UPDATE schedule SET frequency = 'fortnightly' WHERE id = 1")

        #expect(try await schedule.frequency() == nil)
        let remaining = try db.countRowsForTesting(in: "schedule")
        #expect(remaining == 0)
    }

    @Test func persistsAcrossTwoInstancesSharingDirectory() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let writer = ScheduleStore(database: StorageDatabase(directory: appGroup))
        let reader = ScheduleStore(database: StorageDatabase(directory: appGroup))

        try await writer.save(.weekly)
        #expect(try await reader.frequency() == .weekly)
    }
}
