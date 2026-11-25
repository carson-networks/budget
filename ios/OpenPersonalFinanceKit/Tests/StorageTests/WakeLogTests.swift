import Domain
import Foundation
import Storage
import Testing

struct WakeLogTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private let log: WakeLog

    init() {
        log = WakeLog(directory: AppGroupDirectory(url: directory))
    }

    private var file: URL { directory.appending(path: "wake-log.json") }

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
        #expect(!FileManager.default.fileExists(atPath: directory.appending(path: "wake-log.lock").path))
    }

    @Test func keepsTheNewestEntriesOnceFull() async throws {
        for index in 0..<(WakeLog.capacity + 3) {
            try await log.append(Self.entry(index))
        }
        let entries = try await log.entries()
        #expect(entries.count == WakeLog.capacity)
        #expect(entries.first?.changeCount == 3)
        #expect(entries.last?.changeCount == WakeLog.capacity + 2)
    }

    @Test(arguments: [
        "not json",
        #"{ "schemaVersion": 99, "entries": [] }"#,
        #"{ "entries": [] }"#,
        #"{ "schemaVersion": 1, "entries": [{ "trigger": "backgroundDelivery" }] }"#,
        #"""
        { "schemaVersion": 1, "entries": [{ "date": 0, "trigger": "push", "dataTypes": [],
          "outcome": "succeeded", "accountCount": 0, "changeCount": 0 }] }
        """#,
    ])
    func replacesACorruptOrIncompatibleFile(contents: String) async throws {
        try await log.append(Self.entry(1))
        try Data(contents.utf8).write(to: file)

        #expect(try await log.entries().isEmpty)

        try await log.append(Self.entry(2))
        #expect(try await log.entries() == [Self.entry(2)])
    }

    @Test func writesAVersionedEnvelope() async throws {
        try await log.append(Self.entry(1, outcome: .invalidToken))
        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any]
        #expect(object?["schemaVersion"] as? Int == 1)
        let entry = (object?["entries"] as? [[String: Any]])?.first
        #expect(entry?["trigger"] as? String == "backgroundDelivery")
        #expect(entry?["dataTypes"] as? [String] == ["transactions", "balances"])
        #expect(entry?["outcome"] as? String == "invalidToken")
    }

    @Test func anUnreadableFileThrowsAndIsKept() async throws {
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: true)

        await #expect(throws: (any Error).self) { try await log.entries() }
        await #expect(throws: (any Error).self) { try await log.append(Self.entry(1)) }
        #expect(FileManager.default.fileExists(atPath: file.path))
    }

    @Test func waitsForTheLockInsteadOfDroppingAnEntry() async throws {
        let lock = FileLock(file: directory.appending(path: "wake-log.lock"))
        let held = try #require(try lock.tryAcquire())
        let releaser = Task {
            try await Task.sleep(for: .milliseconds(100))
            lock.release(held)
        }

        try await log.append(Self.entry(1))
        try await releaser.value
        #expect(try await log.entries() == [Self.entry(1)])
    }

    @Test func givesUpWhenTheLockIsNeverReleased() async throws {
        let lock = FileLock(file: directory.appending(path: "wake-log.lock"))
        _ = try #require(try lock.tryAcquire())
        let impatient = WakeLog(directory: AppGroupDirectory(url: directory), lockWait: .milliseconds(100))

        await #expect(throws: FileLockError.timedOut) { try await impatient.append(Self.entry(1)) }
    }

    // Two logs on one directory stand in for the app and the extension: without the lock, appends are lost.
    @Test func concurrentWritersFromTwoProcessesLoseNothing() async throws {
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
}
