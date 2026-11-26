import Domain
import Foundation
import GRDB

// Per-account row storage so concurrent saves to different accounts never clobber each other.
package actor TokenStore: TokenStoring {
    private struct TokenRow: FetchableRecord, Sendable {
        let accountID: String
        let accountToken: Data?
        let balanceToken: Data?
        let transactionToken: Data?
        let pendingFullResync: Bool

        init(row: Row) throws {
            accountID = row["account_id"]
            accountToken = row["account_token"]
            balanceToken = row["balance_token"]
            transactionToken = row["transaction_token"]
            pendingFullResync = row["pending_full_resync"]
        }

        var tokens: AccountTokens {
            AccountTokens(
                accountToken: accountToken,
                balanceToken: balanceToken,
                transactionToken: transactionToken,
                pendingFullResync: pendingFullResync
            )
        }
    }

    private let database: StorageDatabase

    package init(database: StorageDatabase) {
        self.database = database
    }

    package init(directory: AppGroupDirectory) {
        self.init(database: StorageDatabase(directory: directory))
    }

    package func tokens(for accountID: UUID) throws -> AccountTokens {
        try database.read { db in
            try TokenRow.fetchOne(
                db,
                sql: """
                    SELECT account_id, account_token, balance_token, transaction_token, pending_full_resync
                    FROM account_tokens
                    WHERE account_id = ?
                    """,
                arguments: [accountID.uuidString]
            )?.tokens ?? .empty
        }
    }

    package func save(_ tokens: AccountTokens, for accountID: UUID) async throws {
        let updatedAt = Date().timeIntervalSince1970
        try await database.writeAsync(reason: "TokenStore.save") { db in
            try db.execute(
                sql: """
                    INSERT INTO account_tokens (
                        account_id, account_token, balance_token, transaction_token, pending_full_resync, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(account_id) DO UPDATE SET
                        account_token = excluded.account_token,
                        balance_token = excluded.balance_token,
                        transaction_token = excluded.transaction_token,
                        pending_full_resync = excluded.pending_full_resync,
                        updated_at = excluded.updated_at
                    """,
                arguments: [
                    accountID.uuidString,
                    tokens.accountToken,
                    tokens.balanceToken,
                    tokens.transactionToken,
                    tokens.pendingFullResync,
                    updatedAt,
                ]
            )
        }
    }

    package func markPendingFullResync(for accountID: UUID) async throws {
        let updatedAt = Date().timeIntervalSince1970
        try await database.writeAsync(reason: "TokenStore.markPendingFullResync") { db in
            try db.execute(
                sql: """
                    INSERT INTO account_tokens (
                        account_id, account_token, balance_token, transaction_token, pending_full_resync, updated_at
                    )
                    VALUES (?, NULL, NULL, NULL, 1, ?)
                    ON CONFLICT(account_id) DO UPDATE SET
                        account_token = NULL,
                        balance_token = NULL,
                        transaction_token = NULL,
                        pending_full_resync = 1,
                        updated_at = excluded.updated_at
                    """,
                arguments: [accountID.uuidString, updatedAt]
            )
        }
    }

    package func removeAll() async throws {
        try await database.writeAsync(reason: "TokenStore.removeAll") { db in
            try db.execute(sql: "DELETE FROM account_tokens")
        }
    }
}
