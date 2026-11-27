import Domain
import Foundation
import SQLite3
import Storage
import Testing

struct ScheduleStoreTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private let store: ScheduleStore

    init() {
        store = ScheduleStore(directory: AppGroupDirectory(url: directory))
    }

    private var file: URL { directory.appending(path: "storage.sqlite") }

    @Test func hasNoChoiceUntilOneIsSaved() async throws {
        #expect(try await store.frequency() == nil)
    }

    @Test(arguments: SyncFrequency.allCases)
    func savesAndSurvivesANewInstance(frequency: SyncFrequency) async throws {
        try await store.save(frequency)
        let reopened = ScheduleStore(directory: AppGroupDirectory(url: directory))
        #expect(try await reopened.frequency() == frequency)
    }

    @Test func ignoresMalformedFrequencyRowAndAllowsOverwrite() async throws {
        try await store.save(.hourly)
        try executeSQL("UPDATE schedule SET frequency = 'monthly' WHERE id = 1", at: file)

        #expect(try await store.frequency() == nil)

        try await store.save(.daily)
        #expect(try await store.frequency() == .daily)
    }

    @Test func recoversFromCorruptDatabase() async throws {
        try await store.save(.hourly)
        try Data("not a sqlite database".utf8).write(to: file)

        #expect(try await store.frequency() == nil)

        try await store.save(.weekly)
        #expect(try await store.frequency() == .weekly)
    }

    private func executeSQL(_ sql: String, at url: URL) throws {
        var db: OpaquePointer?
        #expect(sqlite3_open(url.path, &db) == SQLITE_OK)
        defer { sqlite3_close(db) }
        #expect(sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK)
    }
}
