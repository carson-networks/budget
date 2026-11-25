public struct WalletRead: Sendable {
    // The store-wide account history, as read.
    public let accounts: WalletChanges<WalletAccount>
    public let histories: [AccountHistoryRead]

    package init(accounts: WalletChanges<WalletAccount>, histories: [AccountHistoryRead]) {
        self.accounts = accounts
        self.histories = histories
    }
}
