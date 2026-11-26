import Foundation
import GRDB
import os

// Cross-process logical lease backed by an atomic single-row upsert instead of a kernel flock.
package struct SyncLease: Sendable {
    package struct Lease: Sendable {
        fileprivate let owner: UUID
    }

    private let database: StorageDatabase
    private let timeToLive: TimeInterval
    private let now: @Sendable () -> Date

    package init(
        database: StorageDatabase,
        timeToLive: TimeInterval = 45,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.database = database
        self.timeToLive = timeToLive
        self.now = now
    }

    package init(
        directory: AppGroupDirectory,
        timeToLive: TimeInterval = 45,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.init(database: StorageDatabase(directory: directory), timeToLive: timeToLive, now: now)
    }

    // Never waits: nil while another holder's lease is unexpired.
    @_disfavoredOverload
    package func tryAcquire() throws -> Lease? {
        let candidate = Lease(owner: UUID())
        let current = now().timeIntervalSince1970
        let expiresAt = current + timeToLive
        let acquired = try database.write(reason: "SyncLease.tryAcquire") { db in
            try Self.attemptAcquire(db: db, owner: candidate.owner, expiresAt: expiresAt, current: current)
        }
        return acquired ? candidate : nil
    }

    package func tryAcquire() async throws -> Lease? {
        let candidate = Lease(owner: UUID())
        let current = now().timeIntervalSince1970
        let expiresAt = current + timeToLive
        let acquired = try await database.writeAsync(reason: "SyncLease.tryAcquire") { db in
            try Self.attemptAcquire(db: db, owner: candidate.owner, expiresAt: expiresAt, current: current)
        }
        return acquired ? candidate : nil
    }

    // Extends expiry only while this lease still owns the row and has not already expired.
    @_disfavoredOverload
    package func renew(_ lease: Lease) throws -> Bool {
        let current = now().timeIntervalSince1970
        let expiresAt = current + timeToLive
        return try database.write(reason: "SyncLease.renew") { db in
            try Self.attemptRenew(db: db, owner: lease.owner, expiresAt: expiresAt, current: current)
        }
    }

    package func renew(_ lease: Lease) async throws -> Bool {
        let current = now().timeIntervalSince1970
        let expiresAt = current + timeToLive
        return try await database.writeAsync(reason: "SyncLease.renew") { db in
            try Self.attemptRenew(db: db, owner: lease.owner, expiresAt: expiresAt, current: current)
        }
    }

    // Leaves the row alone if the lease expired and another process acquired it.
    @_disfavoredOverload
    package func release(_ lease: Lease) throws {
        try database.write(reason: "SyncLease.release") { db in
            try Self.performRelease(db: db, owner: lease.owner)
        }
    }

    package func release(_ lease: Lease) async throws {
        try await database.writeAsync(reason: "SyncLease.release") { db in
            try Self.performRelease(db: db, owner: lease.owner)
        }
    }

    private static func attemptAcquire(
        db: Database,
        owner: UUID,
        expiresAt: TimeInterval,
        current: TimeInterval
    ) throws -> Bool {
        try db.execute(
            sql: """
                INSERT INTO sync_lease (id, owner, expires_at)
                VALUES (1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    owner = excluded.owner,
                    expires_at = excluded.expires_at
                WHERE sync_lease.expires_at < ? OR sync_lease.owner = excluded.owner
                """,
            arguments: [owner.uuidString, expiresAt, current]
        )
        return db.changesCount == 1
    }

    private static func attemptRenew(
        db: Database,
        owner: UUID,
        expiresAt: TimeInterval,
        current: TimeInterval
    ) throws -> Bool {
        try db.execute(
            sql: """
                UPDATE sync_lease
                SET expires_at = ?
                WHERE id = 1 AND owner = ? AND expires_at >= ?
                """,
            arguments: [expiresAt, owner.uuidString, current]
        )
        return db.changesCount == 1
    }

    private static func performRelease(db: Database, owner: UUID) throws {
        try db.execute(
            sql: "DELETE FROM sync_lease WHERE id = 1 AND owner = ?",
            arguments: [owner.uuidString]
        )
    }
}
