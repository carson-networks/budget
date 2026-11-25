import Domain
import Foundation
import Storage
import Testing

struct ScheduleStoreTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private let store: ScheduleStore

    init() {
        store = ScheduleStore(directory: AppGroupDirectory(url: directory))
    }

    private var file: URL { directory.appending(path: "schedule.json") }

    @Test func hasNoChoiceUntilOneIsSaved() async throws {
        #expect(try await store.frequency() == nil)
    }

    @Test(arguments: SyncFrequency.allCases)
    func savesAndSurvivesANewInstance(frequency: SyncFrequency) async throws {
        try await store.save(frequency)
        let reopened = ScheduleStore(directory: AppGroupDirectory(url: directory))
        #expect(try await reopened.frequency() == frequency)
    }

    @Test func writesAVersionedEnvelope() async throws {
        try await store.save(.daily)
        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any]
        #expect(object?["schemaVersion"] as? Int == 1)
        #expect(object?["frequency"] as? String == "daily")
    }

    @Test(arguments: [
        "not json",
        #"{ "schemaVersion": 99, "frequency": "daily" }"#,
        #"{ "frequency": "daily" }"#,
        #"{ "schemaVersion": 1, "frequency": "monthly" }"#,
    ])
    func clearsACorruptOrIncompatibleFile(contents: String) async throws {
        try await store.save(.hourly)
        try Data(contents.utf8).write(to: file)

        #expect(try await store.frequency() == nil)
        #expect(!FileManager.default.fileExists(atPath: file.path))
    }
}
