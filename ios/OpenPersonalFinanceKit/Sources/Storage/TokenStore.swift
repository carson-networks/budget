import Domain
import Foundation
import GRDB

// Per-account row storage so concurrent saves to different accounts never clobber each other.
package actor TokenStore: TokenStoring {
    private struct TokenRow: FetchableRecord, Sendable {
        let accountToken: Data?
        let balanceToken: Data?
        let transactionToken: Data?

        init(row: Row) {
            accountToken = row["account_token"]
            balanceToken = row["balance_token"]
            transactionToken = row["transaction_token"]
        }

        var tokens: AccountTokens {
            AccountTokens(accountToken: accountToken, balanceToken: balanceToken, transactionToken: transactionToken)
        }
    }

    private let database: StorageDatabase

    package init(database: StorageDatabase) {
        self.database = database
    }

    package init(directory: AppGroupDirectory) {
        self.init(database: StorageDatabase(directory: directory))
    }

    package func accountIDs() throws -> [UUID] {
        try database.read { db in
            try String.fetchAll(db, sql: "SELECT account_id FROM account_tokens ORDER BY account_id ASC")
                .compactMap(UUID.init(uuidString:))
        }
    }

    package func tokens(for accountID: UUID) throws -> AccountTokens {
        try database.read { db in
            try TokenRow.fetchOne(
                db,
                sql: """
                    SELECT account_token, balance_token, transaction_token
                    FROM account_tokens
                    WHERE account_id = ?
                    """,
                arguments: [accountID.uuidString]
            )?.tokens ?? .empty
        }
    }

    package func save(_ tokens: AccountTokens, for accountID: UUID) async throws {
        let updatedAt = Date().timeIntervalSince1970
        try await database.write(reason: "TokenStore.save") { db in
            try db.execute(
                sql: """
                    INSERT INTO account_tokens (
                        account_id, account_token, balance_token, transaction_token, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(account_id) DO UPDATE SET
                        account_token = excluded.account_token,
                        balance_token = excluded.balance_token,
                        transaction_token = excluded.transaction_token,
                        updated_at = excluded.updated_at
                    """,
                arguments: [
                    accountID.uuidString,
                    tokens.accountToken,
                    tokens.balanceToken,
                    tokens.transactionToken,
                    updatedAt,
                ]
            )
        }
    }

    package func removeAll() async throws {
        try await database.write(reason: "TokenStore.removeAll") { db in
            try db.execute(sql: "DELETE FROM account_tokens")
        }
    }
}
