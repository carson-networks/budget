import Domain
import Foundation
import SwiftData

// Per-account @Model rows so concurrent saves to different accounts never clobber each other.
package actor TokenStore: TokenStoring {
    private let container: StorageContainer

    package init(container: StorageContainer) {
        self.container = container
    }

    package init(directory: AppGroupDirectory) {
        self.init(container: StorageContainer(directory: directory))
    }

    package func tokens(for accountID: UUID) async throws -> AccountTokens {
        let targetID = accountID
        return try await container.read { context in
            var descriptor = FetchDescriptor<StoredToken>(predicate: #Predicate { $0.accountID == targetID })
            descriptor.fetchLimit = 1
            guard let stored = try context.fetch(descriptor).first else {
                return .empty
            }
            return AccountTokens(
                accountToken: stored.accountToken,
                balanceToken: stored.balanceToken,
                transactionToken: stored.transactionToken,
                pendingFullResync: stored.pendingFullResync
            )
        }
    }

    package func save(_ tokens: AccountTokens, for accountID: UUID) async throws {
        let targetID = accountID
        let updatedAt = Date()
        try await container.writeAsync(reason: "TokenStore.save") { context in
            var descriptor = FetchDescriptor<StoredToken>(predicate: #Predicate { $0.accountID == targetID })
            descriptor.fetchLimit = 1
            if let existing = try context.fetch(descriptor).first {
                existing.accountToken = tokens.accountToken
                existing.balanceToken = tokens.balanceToken
                existing.transactionToken = tokens.transactionToken
                existing.pendingFullResync = tokens.pendingFullResync
                existing.updatedAt = updatedAt
            } else {
                context.insert(
                    StoredToken(
                        accountID: targetID,
                        accountToken: tokens.accountToken,
                        balanceToken: tokens.balanceToken,
                        transactionToken: tokens.transactionToken,
                        pendingFullResync: tokens.pendingFullResync,
                        updatedAt: updatedAt
                    )
                )
            }
            try context.save()
        }
    }

    package func markPendingFullResync(for accountID: UUID) async throws {
        let targetID = accountID
        let updatedAt = Date()
        try await container.writeAsync(reason: "TokenStore.markPendingFullResync") { context in
            var descriptor = FetchDescriptor<StoredToken>(predicate: #Predicate { $0.accountID == targetID })
            descriptor.fetchLimit = 1
            if let existing = try context.fetch(descriptor).first {
                existing.accountToken = nil
                existing.balanceToken = nil
                existing.transactionToken = nil
                existing.pendingFullResync = true
                existing.updatedAt = updatedAt
            } else {
                context.insert(
                    StoredToken(
                        accountID: targetID,
                        accountToken: nil,
                        balanceToken: nil,
                        transactionToken: nil,
                        pendingFullResync: true,
                        updatedAt: updatedAt
                    )
                )
            }
            try context.save()
        }
    }

    package func removeAll() async throws {
        try await container.writeAsync(reason: "TokenStore.removeAll") { context in
            try context.delete(model: StoredToken.self)
            try context.save()
        }
    }
}
