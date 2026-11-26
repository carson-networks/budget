import CoreData
import Domain
import Foundation

// Per-account Core Data entities so concurrent saves to different accounts never clobber each other.
package actor TokenStore: TokenStoring {
    private let container: StorageContainer

    package init(container: StorageContainer) {
        self.container = container
    }

    package init(directory: AppGroupDirectory) {
        self.init(container: StorageContainer(directory: directory))
    }

    package func tokens(for accountID: UUID) throws -> AccountTokens {
        try container.read { context in
            guard let record = try Self.fetchTokenRecord(for: accountID, in: context) else {
                return .empty
            }
            return AccountTokens(
                accountToken: record.value(forKey: "accountToken") as? Data,
                balanceToken: record.value(forKey: "balanceToken") as? Data,
                transactionToken: record.value(forKey: "transactionToken") as? Data,
                pendingFullResync: record.value(forKey: "pendingFullResync") as? Bool ?? false
            )
        }
    }

    package func save(_ tokens: AccountTokens, for accountID: UUID) async throws {
        let updatedAt = Date()
        try await container.writeAsync(reason: "TokenStore.save", mergePolicy: .mergeByPropertyObjectTrump) { context in
            let record =
                try Self.fetchTokenRecord(for: accountID, in: context)
                ?? Self.insertTokenRecord(for: accountID, in: context)
            record.setValue(tokens.accountToken, forKey: "accountToken")
            record.setValue(tokens.balanceToken, forKey: "balanceToken")
            record.setValue(tokens.transactionToken, forKey: "transactionToken")
            record.setValue(tokens.pendingFullResync, forKey: "pendingFullResync")
            record.setValue(updatedAt, forKey: "updatedAt")
            try context.save()
        }
    }

    package func markPendingFullResync(for accountID: UUID) async throws {
        let updatedAt = Date()
        try await container.writeAsync(
            reason: "TokenStore.markPendingFullResync",
            mergePolicy: .mergeByPropertyObjectTrump
        ) { context in
            let record =
                try Self.fetchTokenRecord(for: accountID, in: context)
                ?? Self.insertTokenRecord(for: accountID, in: context)
            record.setValue(nil, forKey: "accountToken")
            record.setValue(nil, forKey: "balanceToken")
            record.setValue(nil, forKey: "transactionToken")
            record.setValue(true, forKey: "pendingFullResync")
            record.setValue(updatedAt, forKey: "updatedAt")
            try context.save()
        }
    }

    package func removeAll() async throws {
        try await container.writeAsync(reason: "TokenStore.removeAll", mergePolicy: .mergeByPropertyObjectTrump) {
            context in
            let request = NSFetchRequest<NSManagedObject>(entityName: StorageModel.tokenEntity)
            let records = try context.fetch(request)
            records.forEach { context.delete($0) }
            if context.hasChanges {
                try context.save()
            }
        }
    }

    private static func fetchTokenRecord(
        for accountID: UUID,
        in context: NSManagedObjectContext
    ) throws -> NSManagedObject? {
        let request = NSFetchRequest<NSManagedObject>(entityName: StorageModel.tokenEntity)
        request.predicate = NSPredicate(format: "accountID == %@", accountID as CVarArg)
        request.fetchLimit = 1
        request.shouldRefreshRefetchedObjects = true
        return try context.fetch(request).first
    }

    private static func insertTokenRecord(
        for accountID: UUID,
        in context: NSManagedObjectContext
    ) -> NSManagedObject {
        let record = NSEntityDescription.insertNewObject(forEntityName: StorageModel.tokenEntity, into: context)
        record.setValue(accountID, forKey: "accountID")
        return record
    }
}
