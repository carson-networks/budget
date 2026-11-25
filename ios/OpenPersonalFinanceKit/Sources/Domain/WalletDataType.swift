// The kinds of Wallet data a background delivery wake can name.
public enum WalletDataType: String, Sendable, CaseIterable {
    case accounts
    case balances
    case transactions
}
