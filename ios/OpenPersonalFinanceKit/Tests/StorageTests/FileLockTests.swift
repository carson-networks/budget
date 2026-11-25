import Foundation
import Storage
import Testing

struct FileLockTests {
    private static let start = Date(timeIntervalSince1970: 1_800_000_000)

    private let directory = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString)

    private var file: URL { directory.appending(path: "test.lock") }

    private func lock(at date: Date = start) -> FileLock {
        FileLock(file: file, timeToLive: .seconds(45), now: { date })
    }

    @Test func aHeldLeaseKeepsOthersOutUntilReleased() throws {
        let first = try #require(try lock().tryAcquire())
        #expect(try lock().tryAcquire() == nil)

        lock().release(first)
        #expect(!FileManager.default.fileExists(atPath: file.path))
        #expect(try lock().tryAcquire() != nil)
    }

    @Test func aStaleLeaseExpires() throws {
        _ = try #require(try lock().tryAcquire())

        #expect(try lock(at: Self.start.addingTimeInterval(44)).tryAcquire() == nil)
        #expect(try lock(at: Self.start.addingTimeInterval(45)).tryAcquire() != nil)
    }

    @Test func releasingAnExpiredLeaseLeavesTheNewHoldersLease() throws {
        let expired = try #require(try lock().tryAcquire())
        let later = lock(at: Self.start.addingTimeInterval(60))
        _ = try #require(try later.tryAcquire())

        lock().release(expired)
        #expect(try later.tryAcquire() == nil)
    }

    // An empty file is what a lease looks like between its creation and its first write.
    @Test func aLeaseFileWithoutContentsAgesByItsModificationDate() throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data().write(to: file)
        try FileManager.default.setAttributes([.modificationDate: Self.start], ofItemAtPath: file.path)

        #expect(try lock(at: Self.start.addingTimeInterval(10)).tryAcquire() == nil)
        #expect(try lock(at: Self.start.addingTimeInterval(46)).tryAcquire() != nil)
    }

    @Test func onlyOneOfManyConcurrentAcquirersWins() async throws {
        // Two lock values on one file stand in for the app and the extension, which share nothing but the file.
        let locks = [FileLock(file: file), FileLock(file: file)]
        let winners = try await withThrowingTaskGroup(of: Bool.self) { group in
            for index in 0..<40 {
                group.addTask { try locks[index % 2].tryAcquire() != nil }
            }
            return try await group.reduce(0) { $0 + ($1 ? 1 : 0) }
        }
        #expect(winners == 1)
    }

    @Test func acquireWaitsForARelease() async throws {
        let held = try #require(try FileLock(file: file).tryAcquire())

        async let waiting = FileLock(file: file).acquire(waitingUpTo: .seconds(30))
        try await Task.sleep(for: .milliseconds(100))
        FileLock(file: file).release(held)
        let lease = try await waiting

        #expect(try FileLock(file: file).tryAcquire() == nil)
        FileLock(file: file).release(lease)
        #expect(try FileLock(file: file).tryAcquire() != nil)
    }

    @Test func acquireGivesUpAfterItsLimit() async throws {
        _ = try #require(try FileLock(file: file).tryAcquire())

        await #expect(throws: FileLockError.timedOut) {
            try await FileLock(file: file).acquire(waitingUpTo: .milliseconds(100))
        }
    }
}
