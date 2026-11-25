import Foundation

package struct WalletFixture: Sendable {
    package static let empty = WalletFixture(accounts: [], accountHistories: [])

    package struct AccountHistory: Sendable {
        package let accountID: UUID
        package let balances: [WalletChanges<WalletBalance>]
        package let transactions: [WalletChanges<WalletTransaction>]

        package init(
            accountID: UUID,
            balances: [WalletChanges<WalletBalance>],
            transactions: [WalletChanges<WalletTransaction>]
        ) {
            self.accountID = accountID
            self.balances = balances
            self.transactions = transactions
        }
    }

    package let accounts: [WalletChanges<WalletAccount>]
    package let accountHistories: [AccountHistory]

    package init(accounts: [WalletChanges<WalletAccount>], accountHistories: [AccountHistory]) {
        self.accounts = accounts
        self.accountHistories = accountHistories
    }

    package func history(for accountID: UUID) -> AccountHistory? {
        accountHistories.first { $0.accountID == accountID }
    }

    // Each stream keeps its own steps, so an account first seen in `next` starts at its own step 0.
    package func appending(_ next: WalletFixture) -> WalletFixture {
        var histories = accountHistories
        for history in next.accountHistories {
            if let index = histories.firstIndex(where: { $0.accountID == history.accountID }) {
                histories[index] = AccountHistory(
                    accountID: history.accountID,
                    balances: histories[index].balances + history.balances,
                    transactions: histories[index].transactions + history.transactions
                )
            } else {
                histories.append(history)
            }
        }
        return WalletFixture(accounts: accounts + next.accounts, accountHistories: histories)
    }
}
