import Foundation

// One FinanceKit history token per stream; `accountToken` is the store-wide account history read for this account.
public struct AccountTokens: Equatable, Sendable {
    public static let empty = AccountTokens()

    public let accountToken: Data?
    public let balanceToken: Data?
    public let transactionToken: Data?

    public init(accountToken: Data? = nil, balanceToken: Data? = nil, transactionToken: Data? = nil) {
        self.accountToken = accountToken
        self.balanceToken = balanceToken
        self.transactionToken = transactionToken
    }
}
