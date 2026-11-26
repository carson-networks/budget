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
        let container = StorageContainer(directory: appGroup)
        let schedule = ScheduleStore(container: container)
        try await schedule.save(.daily)

        try await container.corruptScheduleForTesting()

        #expect(try await schedule.frequency() == nil)
        #expect(try container.scheduleRowCountForTesting() == 0)
    }

    @Test func persistsAcrossTwoInstancesSharingDirectory() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let writer = ScheduleStore(container: StorageContainer(directory: appGroup))
        let reader = ScheduleStore(container: StorageContainer(directory: appGroup))

        try await writer.save(.weekly)
        #expect(try await reader.frequency() == .weekly)
    }
}
