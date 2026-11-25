import Foundation
import os

package enum FileLockError: Error, Equatable {
    case timedOut
}

// A lease file shared by the app and the extension. Never a kernel flock: holding one in the App Group
// while suspended gets the process killed (0xdead10cc), and blocking on one stalls the cooperative pool.
package struct FileLock: Sendable {
    package struct Lease: Sendable {
        fileprivate let owner: UUID
        fileprivate let expiry: Date

        fileprivate var contents: Data {
            Data("\(owner.uuidString)\n\(expiry.timeIntervalSince1970)".utf8)
        }
    }

    private struct Holder {
        let contents: Data
        let owner: UUID?
        let expiry: Date
    }

    private let file: URL
    private let timeToLive: TimeInterval
    private let now: @Sendable () -> Date

    // Short, so a lease left by a crashed process frees the file soon after.
    package init(file: URL, timeToLive: Duration = .seconds(45), now: @escaping @Sendable () -> Date = Date.init) {
        self.file = file
        self.timeToLive = timeToLive / .seconds(1)
        self.now = now
    }

    // Nil while another live lease holds the file.
    package func tryAcquire() throws -> Lease? {
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        // A second pass follows a holder that vanished or a stale lease that was broken.
        for _ in 0..<2 {
            let lease = Lease(owner: UUID(), expiry: now().addingTimeInterval(timeToLive))
            if try create(lease) {
                return lease
            }
            guard let holder = try readHolder() else { continue }
            guard holder.expiry <= now() else { return nil }
            Log.logger.warning("Breaking a stale lease on \(file.lastPathComponent, privacy: .public)")
            breakStale(holder)
        }
        return nil
    }

    // Retries with Task.sleep rather than blocking, so a short wait never stalls a thread.
    package func acquire(
        waitingUpTo limit: Duration,
        retryInterval: Duration = .milliseconds(20)
    ) async throws -> Lease {
        let clock = ContinuousClock()
        let deadline = clock.now.advanced(by: limit)
        while true {
            if let lease = try tryAcquire() {
                return lease
            }
            guard clock.now < deadline else {
                throw FileLockError.timedOut
            }
            try await Task.sleep(for: retryInterval)
        }
    }

    // Leaves the file alone once another process has taken over an expired lease.
    package func release(_ lease: Lease) {
        do {
            guard let holder = try readHolder(), holder.owner == lease.owner else { return }
            try FileManager.default.removeItem(at: file)
        } catch {
            Log.logger.error("Releasing a lease failed: \(String(describing: error), privacy: .public)")
        }
    }

    private func create(_ lease: Lease) throws -> Bool {
        let descriptor = open(file.path(percentEncoded: false), O_CREAT | O_EXCL | O_WRONLY, 0o644)
        guard descriptor != -1 else {
            let code = errno
            if code == EEXIST {
                return false
            }
            throw POSIXError(POSIXErrorCode(rawValue: code) ?? .EIO)
        }
        let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
        do {
            try handle.write(contentsOf: lease.contents)
            try handle.close()
        } catch {
            try? FileManager.default.removeItem(at: file)
            throw error
        }
        return true
    }

    // Nil when there is no lease file.
    private func readHolder() throws -> Holder? {
        let contents: Data
        do {
            contents = try Data(contentsOf: file)
        } catch CocoaError.fileReadNoSuchFile {
            return nil
        }
        let lines = String(decoding: contents, as: UTF8.self).split(separator: "\n")
        if lines.count == 2, let owner = UUID(uuidString: String(lines[0])),
            let expiry = TimeInterval(String(lines[1]))
        {
            return Holder(contents: contents, owner: owner, expiry: Date(timeIntervalSince1970: expiry))
        }
        // Empty while its writer is between creating and writing it, so age it by its modification date.
        let attributes = try? FileManager.default.attributesOfItem(atPath: file.path(percentEncoded: false))
        let modified = attributes?[.modificationDate] as? Date
        return Holder(contents: contents, owner: nil, expiry: (modified ?? now()).addingTimeInterval(timeToLive))
    }

    // Removes the file only if it still holds the stale lease, so a fresh lease taken meanwhile survives.
    private func breakStale(_ holder: Holder) {
        guard (try? Data(contentsOf: file)) == holder.contents else { return }
        try? FileManager.default.removeItem(at: file)
    }
}
