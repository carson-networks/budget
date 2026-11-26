import Foundation
import SQLite3
import Storage
import Synchronization
import Testing

struct SyncLeaseTests {
    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)
    private let start = Date(timeIntervalSince1970: 1_800_000_000)

    private func lease(at date: Date? = nil, container: StorageContainer? = nil) -> SyncLease {
        let now = date ?? start
        let storage = container ?? StorageContainer(directory: AppGroupDirectory(url: directory))
        return SyncLease(container: storage, timeToLive: 45, now: { now })
    }

    @Test func usesDeleteJournalModeWithoutLeftoverWalFiles() throws {
        let appDir = AppGroupDirectory(url: directory)
        let container = StorageContainer(directory: appDir)
        let acquired = try #require(try lease(container: container).tryAcquire())
        try lease(container: container).release(acquired)

        var handle: OpaquePointer?
        let file = directory.appending(path: "storage.sqlite")
        #expect(sqlite3_open_v2(file.path, &handle, SQLITE_OPEN_READONLY, nil) == SQLITE_OK)
        defer { sqlite3_close(handle) }
        var statement: OpaquePointer?
        #expect(sqlite3_prepare_v2(handle, "PRAGMA journal_mode", -1, &statement, nil) == SQLITE_OK)
        defer { sqlite3_finalize(statement) }
        #expect(sqlite3_step(statement) == SQLITE_ROW)
        let mode = sqlite3_column_text(statement, 0).map { String(cString: $0) }
        #expect(mode?.lowercased() == "delete")
        #expect(!FileManager.default.fileExists(atPath: directory.appending(path: "storage.sqlite-wal").path))
        #expect(!FileManager.default.fileExists(atPath: directory.appending(path: "storage.sqlite-shm").path))
    }

    @Test func aHeldLeaseBlocksAnotherHolderUntilReleased() throws {
        let appGroup = AppGroupDirectory(url: directory)
        let first = lease(container: StorageContainer(directory: appGroup))
        let second = lease(container: StorageContainer(directory: appGroup))

        let held = try #require(try first.tryAcquire())
        #expect(try second.tryAcquire() == nil)

        try first.release(held)
        #expect(try second.tryAcquire() != nil)
    }

    @Test func anUnexpiredLeaseIsKept() throws {
        _ = try #require(try lease().tryAcquire())
        #expect(try lease(at: start.addingTimeInterval(44)).tryAcquire() == nil)
    }

    @Test func anExpiredLeaseIsBroken() throws {
        let stale = try #require(try lease().tryAcquire())
        let later = lease(at: start.addingTimeInterval(46))

        let replacement = try #require(try later.tryAcquire())

        // The expired holder's release must not delete the replacement holder's lease.
        try lease().release(stale)
        #expect(try lease(at: start.addingTimeInterval(47)).tryAcquire() == nil)
        try later.release(replacement)
        #expect(try lease(at: start.addingTimeInterval(47)).tryAcquire() != nil)
    }

    @Test func renewExtendsAnUnexpiredLease() throws {
        let clock = Mutex(start)
        let appGroup = AppGroupDirectory(url: directory)
        let holder = SyncLease(container: StorageContainer(directory: appGroup), timeToLive: 45) {
            clock.withLock { $0 }
        }
        let contender = SyncLease(container: StorageContainer(directory: appGroup), timeToLive: 45) {
            clock.withLock { $0 }
        }

        let acquired = try #require(try holder.tryAcquire())
        clock.withLock { $0 = start.addingTimeInterval(40) }
        #expect(try holder.renew(acquired))

        // Past the original 45s TTL, the renewed lease still blocks until 40 + 45 = 85s.
        clock.withLock { $0 = start.addingTimeInterval(50) }
        #expect(try contender.tryAcquire() == nil)

        clock.withLock { $0 = start.addingTimeInterval(86) }
        #expect(try contender.tryAcquire() != nil)
    }

    @Test func renewFailsAfterExpiryStealOrRelease() throws {
        let clock = Mutex(start)
        let appGroup = AppGroupDirectory(url: directory)
        let holder = SyncLease(container: StorageContainer(directory: appGroup), timeToLive: 45) {
            clock.withLock { $0 }
        }
        let contender = SyncLease(container: StorageContainer(directory: appGroup), timeToLive: 45) {
            clock.withLock { $0 }
        }

        let first = try #require(try holder.tryAcquire())
        clock.withLock { $0 = start.addingTimeInterval(46) }
        #expect(try !holder.renew(first))

        let second = try #require(try contender.tryAcquire())
        #expect(try !holder.renew(first))

        try contender.release(second)
        #expect(try !contender.renew(second))
    }

    @Test func holdersInTwoInstancesNeverOverlap() async throws {
        let tracker = HolderTracker()
        let appGroup = AppGroupDirectory(url: directory)
        let leases = [
            SyncLease(container: StorageContainer(directory: appGroup)),
            SyncLease(container: StorageContainer(directory: appGroup)),
        ]
        try await withThrowingTaskGroup { group in
            for index in 0..<20 {
                let lease = leases[index % 2]
                group.addTask {
                    while true {
                        if let acquired = try await lease.tryAcquire() {
                            await tracker.enter()
                            try await Task.sleep(for: .milliseconds(1))
                            await tracker.leave()
                            try await lease.release(acquired)
                            return
                        }
                        try await Task.sleep(for: .milliseconds(1))
                    }
                }
            }
            try await group.waitForAll()
        }
        #expect(await tracker.maximum == 1)
        #expect(await tracker.entries == 20)
    }
}

private actor HolderTracker {
    private var current = 0
    private(set) var maximum = 0
    private(set) var entries = 0

    func enter() {
        current += 1
        entries += 1
        maximum = max(maximum, current)
    }

    func leave() {
        current -= 1
    }
}
