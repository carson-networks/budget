import Foundation
import Storage
import Testing

struct FileLockTests {
    private let file = FileManager.default.temporaryDirectory
        .appending(path: UUID().uuidString)
        .appending(path: "test.lock")
    private let start = Date(timeIntervalSince1970: 1_800_000_000)

    private func lock(at date: Date? = nil) -> FileLock {
        let now = date ?? start
        return FileLock(url: file, timeToLive: 45, now: { now })
    }

    @Test func aHeldLeaseBlocksAnotherHolderUntilReleased() throws {
        let first = lock()
        let second = lock()

        let lease = try #require(try first.tryAcquire())
        #expect(try second.tryAcquire() == nil)

        try first.release(lease)
        #expect(!FileManager.default.fileExists(atPath: file.path))
        #expect(try second.tryAcquire() != nil)
    }

    @Test func anUnexpiredLeaseIsKept() throws {
        _ = try #require(try lock().tryAcquire())
        #expect(try lock(at: start.addingTimeInterval(44)).tryAcquire() == nil)
    }

    @Test func anExpiredLeaseIsBroken() throws {
        let stale = try #require(try lock().tryAcquire())
        let later = lock(at: start.addingTimeInterval(46))

        let lease = try #require(try later.tryAcquire())

        // The expired holder's release must not remove the new holder's lease.
        try lock().release(stale)
        #expect(FileManager.default.fileExists(atPath: file.path))
        #expect(try lock(at: start.addingTimeInterval(47)).tryAcquire() == nil)
        try later.release(lease)
        #expect(!FileManager.default.fileExists(atPath: file.path))
    }

    @Test func aLeaseLeftHalfWrittenExpiresByItsFileDate() throws {
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data().write(to: file)
        try FileManager.default.setAttributes([.modificationDate: start], ofItemAtPath: file.path)

        #expect(try lock(at: start.addingTimeInterval(10)).tryAcquire() == nil)
        #expect(try lock(at: start.addingTimeInterval(46)).tryAcquire() != nil)
    }

    @Test func holdersInTwoInstancesNeverOverlap() async throws {
        let tracker = HolderTracker()
        let locks = [FileLock(url: file), FileLock(url: file)]
        try await withThrowingTaskGroup { group in
            for index in 0..<20 {
                let lock = locks[index % 2]
                group.addTask {
                    while true {
                        if let lease = try lock.tryAcquire() {
                            await tracker.enter()
                            try await Task.sleep(for: .milliseconds(1))
                            await tracker.leave()
                            try lock.release(lease)
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
