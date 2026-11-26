import Domain
import Foundation
import Storage
import Testing

struct WakeLogTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)

    private func log() -> WakeLog {
        WakeLog(directory: AppGroupDirectory(url: directory))
    }

    private static func entry(
        _ index: Int,
        trigger: SyncTrigger = .backgroundDelivery,
        dataTypes: [WalletDataType] = [.transactions],
        outcome: WakeLogEntry.Outcome = .succeeded(changeCount: 1)
    ) -> WakeLogEntry {
        WakeLogEntry(
            startedAt: Date(timeIntervalSince1970: 1_800_000_000 + Double(index)),
            duration: .milliseconds(250 + index),
            trigger: trigger,
            dataTypes: dataTypes,
            outcome: outcome
        )
    }

    @Test func startsEmpty() async throws {
        #expect(try await log().entries().isEmpty)
    }

    @Test func roundTripsEveryTriggerDataTypeAndOutcome() async throws {
        let outcomes =
            [WakeLogEntry.Outcome.succeeded(changeCount: 7)] + WakeLogEntry.Failure.allCases.map { .failed($0) }
        var written: [WakeLogEntry] = []
        for (index, outcome) in outcomes.enumerated() {
            for trigger in SyncTrigger.allCases {
                written.append(
                    Self.entry(index, trigger: trigger, dataTypes: WalletDataType.allCases, outcome: outcome))
            }
        }
        written.append(Self.entry(99, dataTypes: []))
        let wakeLog = log()
        for entry in written {
            try await wakeLog.append(entry)
        }

        let read = try await wakeLog.entries()
        #expect(read.map(Summary.init) == written.map(Summary.init))
        #expect(!FileManager.default.fileExists(atPath: directory.appending(path: "wake-log.lock").path))
    }

    @Test func keepsOnlyTheNewestEntries() async throws {
        let wakeLog = log()
        for index in 0..<(WakeLog.capacity + 3) {
            try await wakeLog.append(Self.entry(index))
        }
        let entries = try await wakeLog.entries()
        #expect(entries.count == WakeLog.capacity)
        #expect(entries.first?.startedAt == Self.entry(3).startedAt)
        #expect(entries.last?.startedAt == Self.entry(WakeLog.capacity + 2).startedAt)
    }

    @Test(arguments: [
        "INSERT INTO wake_log (started_at, duration_ms, trigger, data_types_json, change_count, failure) VALUES (0, 1, 'nope', '[]', 1, NULL)",
        "INSERT INTO wake_log (started_at, duration_ms, trigger, data_types_json, change_count, failure) VALUES (0, 1, 'backgroundRefresh', 'not json', 1, NULL)",
        "INSERT INTO wake_log (started_at, duration_ms, trigger, data_types_json, change_count, failure) VALUES (0, 1, 'backgroundRefresh', '[]', NULL, NULL)",
    ])
    func wipesCorruptRowsAndRecovers(sql: String) async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let db = StorageDatabase(directory: appGroup)
        let wakeLog = WakeLog(database: db)
        try await wakeLog.append(Self.entry(1))

        try await db.executeSQLForTesting(sql)

        #expect(try await wakeLog.entries().isEmpty)
        try await wakeLog.append(Self.entry(2))
        #expect(try await wakeLog.entries().map(\.startedAt) == [Self.entry(2).startedAt])
    }

    @Test func twoWritersSharingTheDatabaseLoseNothing() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let app = WakeLog(database: StorageDatabase(directory: appGroup))
        let delivery = WakeLog(database: StorageDatabase(directory: appGroup))
        try await withThrowingTaskGroup { group in
            for index in 0..<40 {
                let writer = index.isMultiple(of: 2) ? app : delivery
                group.addTask { try await writer.append(Self.entry(index)) }
            }
            try await group.waitForAll()
        }
        let starts = try await log().entries().map(\.startedAt)
        #expect(Set(starts) == Set((0..<40).map { Self.entry($0).startedAt }))
    }
}

private struct Summary: Equatable {
    let startedAt: Date
    let duration: Duration
    let trigger: SyncTrigger
    let dataTypes: [WalletDataType]
    let changeCount: Int?
    let failure: WakeLogEntry.Failure?

    init(_ entry: WakeLogEntry) {
        startedAt = entry.startedAt
        duration = entry.duration
        trigger = entry.trigger
        dataTypes = entry.dataTypes
        switch entry.outcome {
        case .succeeded(let count):
            changeCount = count
            failure = nil
        case .failed(let reason):
            changeCount = nil
            failure = reason
        }
    }
}
