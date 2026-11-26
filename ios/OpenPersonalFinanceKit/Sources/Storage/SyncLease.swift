import CoreData
import Foundation

// Cross-process logical lease coordinated via Core Data optimistic locking (Z_OPT) and uniqueness constraints.
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

    // Never waits: nil while another holder's lease is unexpired or a concurrent writer won the save race.
    @_disfavoredOverload
    package func tryAcquire() throws -> Lease? {
        let candidate = Lease(owner: UUID())
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        do {
            let acquired = try container.write(reason: "SyncLease.tryAcquire", mergePolicy: .error) { context in
                try Self.attemptAcquire(in: context, owner: candidate.owner, expiresAt: expiresAt, current: current)
            }
            return acquired ? candidate : nil
        } catch  where Self.isLeaseConflictError(error) {
            return nil
        }
    }

    package func tryAcquire() async throws -> Lease? {
        let candidate = Lease(owner: UUID())
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        do {
            let acquired = try await container.writeAsync(reason: "SyncLease.tryAcquire", mergePolicy: .error) {
                context in
                try Self.attemptAcquire(in: context, owner: candidate.owner, expiresAt: expiresAt, current: current)
            }
            return acquired ? candidate : nil
        } catch  where Self.isLeaseConflictError(error) {
            return nil
        }
    }

    // Extends expiry only while this lease still owns the row and has not already expired.
    @_disfavoredOverload
    package func renew(_ lease: Lease) throws -> Bool {
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        do {
            return try container.write(reason: "SyncLease.renew", mergePolicy: .error) { context in
                try Self.attemptRenew(in: context, owner: lease.owner, expiresAt: expiresAt, current: current)
            }
        } catch  where Self.isLeaseConflictError(error) {
            return false
        }
    }

    package func renew(_ lease: Lease) async throws -> Bool {
        let current = now()
        let expiresAt = current.addingTimeInterval(timeToLive)
        do {
            return try await container.writeAsync(reason: "SyncLease.renew", mergePolicy: .error) { context in
                try Self.attemptRenew(in: context, owner: lease.owner, expiresAt: expiresAt, current: current)
            }
        } catch  where Self.isLeaseConflictError(error) {
            return false
        }
    }

    // Leaves the row alone if the lease expired and another process acquired it.
    @_disfavoredOverload
    package func release(_ lease: Lease) throws {
        do {
            try container.write(reason: "SyncLease.release", mergePolicy: .error) { context in
                try Self.performRelease(in: context, owner: lease.owner)
            }
        } catch  where Self.isLeaseConflictError(error) {
            return
        }
    }

    package func release(_ lease: Lease) async throws {
        do {
            try await container.writeAsync(reason: "SyncLease.release", mergePolicy: .error) { context in
                try Self.performRelease(in: context, owner: lease.owner)
            }
        } catch  where Self.isLeaseConflictError(error) {
            return
        }
    }

    private static func attemptAcquire(
        in context: NSManagedObjectContext,
        owner: UUID,
        expiresAt: Date,
        current: Date
    ) throws -> Bool {
        let existing = try fetchLeaseRecord(in: context)
        if let existing {
            guard let existingExpiry = existing.value(forKey: "expiresAt") as? Date,
                existingExpiry < current
            else {
                return false
            }
            existing.setValue(owner, forKey: "owner")
            existing.setValue(expiresAt, forKey: "expiresAt")
        } else {
            let created = NSEntityDescription.insertNewObject(
                forEntityName: StorageModel.syncLeaseEntity,
                into: context
            )
            created.setValue(Int64(1), forKey: "id")
            created.setValue(owner, forKey: "owner")
            created.setValue(expiresAt, forKey: "expiresAt")
        }
        try context.save()
        return true
    }

    private static func attemptRenew(
        in context: NSManagedObjectContext,
        owner: UUID,
        expiresAt: Date,
        current: Date
    ) throws -> Bool {
        guard let existing = try fetchLeaseRecord(in: context),
            let currentOwner = existing.value(forKey: "owner") as? UUID,
            let existingExpiry = existing.value(forKey: "expiresAt") as? Date,
            currentOwner == owner,
            existingExpiry >= current
        else {
            return false
        }
        existing.setValue(expiresAt, forKey: "expiresAt")
        try context.save()
        return true
    }

    private static func performRelease(in context: NSManagedObjectContext, owner: UUID) throws {
        guard let existing = try fetchLeaseRecord(in: context),
            let currentOwner = existing.value(forKey: "owner") as? UUID,
            currentOwner == owner
        else {
            return
        }
        context.delete(existing)
        try context.save()
    }

    private static func fetchLeaseRecord(in context: NSManagedObjectContext) throws -> NSManagedObject? {
        let request = NSFetchRequest<NSManagedObject>(entityName: StorageModel.syncLeaseEntity)
        request.predicate = NSPredicate(format: "id == %lld", Int64(1))
        request.fetchLimit = 1
        request.shouldRefreshRefetchedObjects = true
        return try context.fetch(request).first
    }

    private static func isLeaseConflictError(_ error: any Error) -> Bool {
        let nsError = error as NSError
        if nsError.domain == NSCocoaErrorDomain {
            switch nsError.code {
            case NSManagedObjectMergeError,
                NSManagedObjectConstraintMergeError,
                NSManagedObjectConstraintValidationError,
                NSPersistentStoreSaveConflictsError:
                return true
            default:
                break
            }
        }
        if nsError.domain == NSSQLiteErrorDomain, nsError.code == 19 {
            return true
        }
        if let underlying = nsError.userInfo[NSUnderlyingErrorKey] as? NSError, isLeaseConflictError(underlying) {
            return true
        }
        if let detailed = nsError.userInfo[NSDetailedErrorsKey] as? [NSError],
            detailed.contains(where: { isLeaseConflictError($0) })
        {
            return true
        }
        return false
    }
}
