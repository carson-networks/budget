import Domain
import Foundation
import Storage
import Testing

struct WakeLogTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private var file: URL { directory.appending(path: "wake-log.json") }

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
        for entry in written {
            try await log().append(entry)
        }

        let read = try await log().entries()
        #expect(read.map(Summary.init) == written.map(Summary.init))
        #expect(!FileManager.default.fileExists(atPath: directory.appending(path: "wake-log.lock").path))
    }

    @Test func keepsOnlyTheNewestEntries() async throws {
        let log = log()
        for index in 0..<(WakeLog.capacity + 3) {
            try await log.append(Self.entry(index))
        }
        let entries = try await log.entries()
        #expect(entries.count == WakeLog.capacity)
        #expect(entries.first?.startedAt == Self.entry(3).startedAt)
        #expect(entries.last?.startedAt == Self.entry(WakeLog.capacity + 2).startedAt)
    }

    @Test(arguments: [
        "not json",
        #"{ "schemaVersion": 2, "entries": [] }"#,
        #"{ "entries": [] }"#,
        #"{ "schemaVersion": 1, "entries": [{ "startedAt": 0, "durationMilliseconds": 1, "trigger": "nope", "dataTypes": [] , "changeCount": 1 }] }"#,
        #"{ "schemaVersion": 1, "entries": [{ "startedAt": 0, "durationMilliseconds": 1, "trigger": "backgroundRefresh", "dataTypes": [] }] }"#,
    ])
    func wipesACorruptOrIncompatibleFileAndStartsAgain(contents: String) async throws {
        try await log().append(Self.entry(1))
        try Data(contents.utf8).write(to: file)

        #expect(try await log().entries().isEmpty)
        try await log().append(Self.entry(2))
        #expect(try await log().entries().map(\.startedAt) == [Self.entry(2).startedAt])
    }

    @Test func twoWritersSharingTheFileLoseNothing() async throws {
        let app = log()
        let delivery = log()
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

// WakeLogEntry is not Equatable, so tests compare what the file has to keep.
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
