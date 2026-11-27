import Domain
import Foundation
import SQLite3
import Storage
import Testing

struct WakeLogTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private let log: WakeLog

    init() {
        log = WakeLog(directory: AppGroupDirectory(url: directory))
    }

    private var file: URL { directory.appending(path: "storage.sqlite") }

    private static func entry(_ changeCount: Int, outcome: WakeLogEntry.Outcome = .succeeded) -> WakeLogEntry {
        WakeLogEntry(
            date: Date(timeIntervalSince1970: 1_800_000_000 + Double(changeCount)),
            trigger: .backgroundDelivery,
            dataTypes: [.transactions, .balances],
            outcome: outcome,
            accountCount: 2,
            changeCount: changeCount
        )
    }

    @Test func startsEmpty() async throws {
        #expect(try await log.entries().isEmpty)
    }

    @Test func appendsInOrderAndSurvivesANewInstance() async throws {
        let refresh = WakeLogEntry(
            date: Date(timeIntervalSince1970: 1_800_000_100),
            trigger: .backgroundRefresh,
            dataTypes: [],
            outcome: .dataUnavailable,
            accountCount: 0,
            changeCount: 0
        )
        try await log.append(Self.entry(1))
        try await log.append(refresh)

        let reopened = WakeLog(directory: AppGroupDirectory(url: directory))
        #expect(try await reopened.entries() == [Self.entry(1), refresh])
    }

    // Seeded in one SQLite transaction rather than 500 appends, which keeps CI fast.
    @Test func keepsTheNewestEntriesOnceFull() async throws {
        #expect(try await log.entries().isEmpty)
        let inserts = (0..<WakeLog.capacity).map { index in
            """
            INSERT INTO wake_log (started_at, trigger, data_types_json, outcome, account_count, change_count)
            VALUES (\(1_800_000_000 + index), 'backgroundDelivery', '["transactions"]', 'succeeded', 1, \(index));
            """
        }
        try executeSQL("BEGIN; \(inserts.joined(separator: "\n")) COMMIT;", at: file)
        #expect(try await log.entries().count == WakeLog.capacity)

        for index in WakeLog.capacity..<(WakeLog.capacity + 3) {
            try await log.append(Self.entry(index))
        }
        let entries = try await log.entries()
        #expect(entries.count == WakeLog.capacity)
        #expect(entries.first?.changeCount == 3)
        #expect(entries.last?.changeCount == WakeLog.capacity + 2)
    }

    // Two StorageDatabase instances on one directory stand in for the app and the extension.
    @Test func concurrentAppendsAcrossTwoInstancesLoseNothing() async throws {
        let app = WakeLog(directory: AppGroupDirectory(url: directory))
        let delivery = WakeLog(directory: AppGroupDirectory(url: directory))
        try await withThrowingTaskGroup(of: Void.self) { group in
            for index in 0..<40 {
                group.addTask { try await (index.isMultiple(of: 2) ? app : delivery).append(Self.entry(index)) }
            }
            try await group.waitForAll()
        }
        let counts = try await app.entries().map(\.changeCount)
        #expect(counts.sorted() == Array(0..<40))
    }

    @Test func skipsMalformedRowsAndKeepsValidOnes() async throws {
        try await log.append(Self.entry(1))
        try executeSQL(
            """
            INSERT INTO wake_log (started_at, trigger, data_types_json, outcome, account_count, change_count)
            VALUES
                (1800000010, 'push', '[]', 'succeeded', 0, 10),
                (1800000011, 'backgroundDelivery', 'not json', 'succeeded', 0, 11),
                (1800000012, 'backgroundDelivery', '["unknown"]', 'succeeded', 0, 12),
                (1800000013, 'backgroundDelivery', '[]', 'bogus', 0, 13);
            """,
            at: file
        )
        try await log.append(Self.entry(2))

        #expect(try await log.entries() == [Self.entry(1), Self.entry(2)])
    }

    @Test func recoversFromCorruptDatabase() async throws {
        try await log.append(Self.entry(1))
        try Data("not a sqlite database".utf8).write(to: file)

        #expect(try await log.entries().isEmpty)

        try await log.append(Self.entry(2))
        #expect(try await log.entries() == [Self.entry(2)])
    }

    @Test func anUnreadableDirectoryAtStorePathThrowsAndIsKept() async throws {
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: true)

        await #expect(throws: (any Error).self) { try await log.entries() }
        await #expect(throws: (any Error).self) { try await log.append(Self.entry(1)) }
        #expect(FileManager.default.fileExists(atPath: file.path))
    }

    private func executeSQL(_ sql: String, at url: URL) throws {
        var db: OpaquePointer?
        #expect(sqlite3_open(url.path, &db) == SQLITE_OK)
        defer { sqlite3_close(db) }
        #expect(sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK)
    }
}
