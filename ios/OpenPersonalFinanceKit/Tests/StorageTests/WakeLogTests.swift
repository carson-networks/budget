import CoreData
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
        ("nope", "[]", 1 as Int64?, nil as String?),
        ("backgroundRefresh", "not json", 1 as Int64?, nil as String?),
        ("backgroundRefresh", "[]", nil as Int64?, nil as String?),
    ])
    func wipesCorruptRowsAndRecovers(
        trigger: String,
        dataTypesJSON: String,
        changeCount: Int64?,
        failure: String?
    ) async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let container = StorageContainer(directory: appGroup)
        let wakeLog = WakeLog(container: container)
        try await wakeLog.append(Self.entry(1))

        try await container.writeAsync(reason: "WakeLogTests.corruptRow", mergePolicy: .mergeByPropertyObjectTrump) {
            context in
            let record = NSEntityDescription.insertNewObject(forEntityName: "WakeLogRecord", into: context)
            record.setValue(UUID(), forKey: "id")
            record.setValue(Int64(999), forKey: "sequence")
            record.setValue(Date(timeIntervalSince1970: 0), forKey: "startedAt")
            record.setValue(Int64(1), forKey: "durationMilliseconds")
            record.setValue(trigger, forKey: "trigger")
            record.setValue(dataTypesJSON, forKey: "dataTypesJSON")
            record.setValue(changeCount.map(NSNumber.init(value:)), forKey: "changeCount")
            record.setValue(failure, forKey: "failure")
            try context.save()
        }

        #expect(try await wakeLog.entries().isEmpty)
        try await wakeLog.append(Self.entry(2))
        #expect(try await wakeLog.entries().map(\.startedAt) == [Self.entry(2).startedAt])
    }

    @Test func twoWritersSharingTheDatabaseLoseNothing() async throws {
        let appGroup = AppGroupDirectory(url: directory)
        let app = WakeLog(container: StorageContainer(directory: appGroup))
        let delivery = WakeLog(container: StorageContainer(directory: appGroup))
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
