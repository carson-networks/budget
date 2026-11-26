import Domain
import Foundation
import Storage
import Testing

struct ScheduleStoreTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private var file: URL { directory.appending(path: "schedule.json") }

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

    @Test(arguments: [
        "not json",
        #"{ "schemaVersion": 2, "frequency": "hourly" }"#,
        #"{ "schemaVersion": 1, "frequency": "fortnightly" }"#,
    ])
    func clearsACorruptOrUnknownChoice(contents: String) async throws {
        try await store().save(.daily)
        try Data(contents.utf8).write(to: file)

        #expect(try await store().frequency() == nil)
        #expect(!FileManager.default.fileExists(atPath: file.path))
    }
}
