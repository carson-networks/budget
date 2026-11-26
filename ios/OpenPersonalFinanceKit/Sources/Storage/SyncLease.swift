import Foundation
import SwiftData

// Cross-process logical lease backed by SwiftData; writes serialize via NSFileCoordinator since SwiftData forces upsert merge policy.
package struct SyncLease: Sendable {
    package struct Lease: Sendable {
        fileprivate let owner: UUID
    }

    private let container: StorageContainer
    private let timeToLive: TimeInterval
    private let now: @Sendable () -> Date

    package init(
        container: StorageContainer,
        timeToLive: TimeInterval = 45,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.container = container
        self.timeToLive = timeToLive
        self.now = now
    }

    package init(
        directory: AppGroupDirectory,
        timeToLive: TimeInterval = 45,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.init(container: StorageContainer(directory: directory), timeToLive: timeToLive, now: now)
    }

    @_disfavoredOverload
    package func tryAcquire() throws -> Lease? {
        let candidate = Lease(owner: UUID())
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        let acquired = try container.writeSync(reason: "SyncLease.tryAcquire") { context in
            try Self.attemptAcquire(in: context, owner: candidate.owner, expiresAt: expiresAt, current: current)
        }
        return acquired ? candidate : nil
    }

    package func tryAcquire() async throws -> Lease? {
        let candidate = Lease(owner: UUID())
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        let acquired = try await container.writeAsync(reason: "SyncLease.tryAcquire") { context in
            try Self.attemptAcquire(in: context, owner: candidate.owner, expiresAt: expiresAt, current: current)
        }
        return acquired ? candidate : nil
    }

    @_disfavoredOverload
    package func renew(_ lease: Lease) throws -> Bool {
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        let owner = lease.owner
        return try container.writeSync(reason: "SyncLease.renew") { context in
            try Self.attemptRenew(in: context, owner: owner, expiresAt: expiresAt, current: current)
        }
    }

    package func renew(_ lease: Lease) async throws -> Bool {
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        let owner = lease.owner
        return try await container.writeAsync(reason: "SyncLease.renew") { context in
            try Self.attemptRenew(in: context, owner: owner, expiresAt: expiresAt, current: current)
        }
    }

    @_disfavoredOverload
    package func release(_ lease: Lease) throws {
        let owner = lease.owner
        try container.writeSync(reason: "SyncLease.release") { context in
            try Self.performRelease(in: context, owner: owner)
        }
    }

    package func release(_ lease: Lease) async throws {
        let owner = lease.owner
        try await container.writeAsync(reason: "SyncLease.release") { context in
            try Self.performRelease(in: context, owner: owner)
        }
    }

    private static func attemptAcquire(
        in context: ModelContext,
        owner: UUID,
        expiresAt: Date,
        current: Date
    ) throws -> Bool {
        if let existing = try fetchLease(in: context) {
            guard existing.expiresAt < current else {
                return false
            }
            existing.owner = owner
            existing.expiresAt = expiresAt
        } else {
            context.insert(StoredSyncLease(owner: owner, expiresAt: expiresAt))
        }
        try context.save()
        return true
    }

    private static func attemptRenew(
        in context: ModelContext,
        owner: UUID,
        expiresAt: Date,
        current: Date
    ) throws -> Bool {
        guard let existing = try fetchLease(in: context),
            existing.owner == owner,
            existing.expiresAt >= current
        else {
            return false
        }
        existing.expiresAt = expiresAt
        try context.save()
        return true
    }

    private static func performRelease(in context: ModelContext, owner: UUID) throws {
        guard let existing = try fetchLease(in: context), existing.owner == owner else {
            return
        }
        context.delete(existing)
        try context.save()
    }

    private static func fetchLease(in context: ModelContext) throws -> StoredSyncLease? {
        let key = 1
        var descriptor = FetchDescriptor<StoredSyncLease>(predicate: #Predicate { $0.key == key })
        descriptor.fetchLimit = 1
        return try context.fetch(descriptor).first
    }
}
