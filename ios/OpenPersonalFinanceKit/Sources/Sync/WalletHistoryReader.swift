import Domain
import Foundation
import os

package struct WalletHistoryReader: WalletHistoryReading {
    private let source: any FinanceDataSource
    private let tokens: any TokenStoring

    package init(source: any FinanceDataSource, tokens: any TokenStoring) {
        self.source = source
        self.tokens = tokens
    }

    // Never overwrites saved tokens, so a change made since an earlier read still shows on the next one.
    package func readEverything() async throws -> WalletRead {
        let accountChanges = try await source.accountChanges(since: nil)
        var histories: [AccountHistoryRead] = []
        for account in accountChanges.inserted + accountChanges.updated {
            let balances = try await source.balanceChanges(accountID: account.id, since: nil)
            let transactions = try await source.transactionChanges(accountID: account.id, since: nil)
            if try await tokens.tokens(for: account.id) == .empty {
                try await tokens.save(
                    AccountTokens(
                        accountToken: accountChanges.newToken,
                        balanceToken: balances.newToken,
                        transactionToken: transactions.newToken
                    ),
                    for: account.id
                )
            }
            histories.append(
                AccountHistoryRead(
                    accountID: account.id,
                    fromSavedToken: false,
                    account: WalletChanges(accountChanges).filtered(to: account.id),
                    balances: WalletChanges(balances),
                    transactions: WalletChanges(transactions)
                )
            )
        }
        Log.logger.info("Read everything for \(histories.count, privacy: .public) accounts")
        return WalletRead(accounts: WalletChanges(accountChanges), histories: histories)
    }

    package func readSinceSavedTokens(accountID: UUID) async throws -> AccountHistoryRead {
        let saved = try await tokens.tokens(for: accountID)
        let accountChanges = try await source.accountChanges(since: saved.accountToken)
        let balances = try await source.balanceChanges(accountID: accountID, since: saved.balanceToken)
        let transactions = try await source.transactionChanges(accountID: accountID, since: saved.transactionToken)
        try await tokens.save(
            AccountTokens(
                accountToken: accountChanges.newToken,
                balanceToken: balances.newToken,
                transactionToken: transactions.newToken
            ),
            for: accountID
        )
        return AccountHistoryRead(
            accountID: accountID,
            fromSavedToken: saved.hasSavedTokens,
            account: WalletChanges(accountChanges).filtered(to: accountID),
            balances: WalletChanges(balances),
            transactions: WalletChanges(transactions)
        )
    }

    package func resetTokens() async throws {
        try await tokens.removeAll()
    }
}
