import Darwin
import Foundation
import os

// A lease file created with O_EXCL instead of a kernel lock, which iOS kills a suspended process for holding.
package struct FileLock: Sendable {
    package struct Lease: Sendable {
        fileprivate let owner: UUID
    }

    private struct LeaseFile: Codable {
        let owner: UUID
        let expiresAt: Date
    }

    private struct HeldLease: Equatable {
        // nil while the holder is still writing the file.
        let owner: UUID?
        let expiresAt: Date
    }

    private let url: URL
    private let timeToLive: TimeInterval
    private let now: @Sendable () -> Date

    // Short, so a lease left by a killed process blocks others only briefly.
    package init(url: URL, timeToLive: TimeInterval = 45, now: @escaping @Sendable () -> Date = { Date() }) {
        self.url = url
        self.timeToLive = timeToLive
        self.now = now
    }

    // Never waits: nil while another holder's lease is unexpired.
    package func tryAcquire() throws -> Lease? {
        let lease = Lease(owner: UUID())
        if try create(lease) {
            return lease
        }
        if let held = try heldLease() {
            guard held.expiresAt < now() else { return nil }
            Log.logger.warning("Breaking an expired lease on \(url.lastPathComponent, privacy: .public)")
            // Removes only the lease just judged expired, not one a racing process created after it.
            if try heldLease() == held {
                try remove()
            }
        }
        return try create(lease) ? lease : nil
    }

    // Leaves the file alone if the lease expired and someone else now holds it.
    package func release(_ lease: Lease) throws {
        guard try heldLease()?.owner == lease.owner else { return }
        try remove()
    }

    private func create(_ lease: Lease) throws -> Bool {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let descriptor = open(url.path, O_CREAT | O_EXCL | O_WRONLY | O_CLOEXEC, 0o644)
        guard descriptor >= 0 else {
            if errno == EEXIST {
                return false
            }
            throw Self.posixError()
        }
        defer { close(descriptor) }
        let data = try JSONEncoder().encode(LeaseFile(owner: lease.owner, expiresAt: now() + timeToLive))
        let written = data.withUnsafeBytes { write(descriptor, $0.baseAddress, $0.count) }
        guard written == data.count else {
            throw Self.posixError()
        }
        return true
    }

    // A lease still being written has no contents yet, so its age comes from the file instead.
    private func heldLease() throws -> HeldLease? {
        let data: Data
        do {
            data = try Data(contentsOf: url)
        } catch CocoaError.fileReadNoSuchFile {
            return nil
        }
        if let lease = try? JSONDecoder().decode(LeaseFile.self, from: data) {
            return HeldLease(owner: lease.owner, expiresAt: lease.expiresAt)
        }
        let attributes: [FileAttributeKey: Any]
        do {
            attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        } catch CocoaError.fileReadNoSuchFile {
            return nil
        }
        let modified = attributes[.modificationDate] as? Date ?? .distantPast
        return HeldLease(owner: nil, expiresAt: modified + timeToLive)
    }

    private func remove() throws {
        do {
            try FileManager.default.removeItem(at: url)
        } catch CocoaError.fileNoSuchFile {
            return
        }
    }

    private static func posixError() -> POSIXError {
        POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
    }
}
