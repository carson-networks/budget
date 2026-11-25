import Foundation

public struct AccountHistoryRead: Sendable {
    public let accountID: UUID
    public let fromSavedToken: Bool
    // Only this account's rows of the store-wide account history.
    public let account: WalletChanges<WalletAccount>
    public let balances: WalletChanges<WalletBalance>
    public let transactions: WalletChanges<WalletTransaction>

    package init(
        accountID: UUID,
        fromSavedToken: Bool,
        account: WalletChanges<WalletAccount>,
        balances: WalletChanges<WalletBalance>,
        transactions: WalletChanges<WalletTransaction>
    ) {
        self.accountID = accountID
        self.fromSavedToken = fromSavedToken
        self.account = account
        self.balances = balances
        self.transactions = transactions
    }
}
