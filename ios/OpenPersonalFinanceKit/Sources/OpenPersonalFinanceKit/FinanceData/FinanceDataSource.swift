import Foundation

/// Read access to Wallet data. Each call drains FinanceKit's non-monitoring history and returns one merged change set.
public protocol FinanceDataSource: Sendable {
    func authorizationStatus() async throws -> WalletAuthorization
    func requestAuthorization() async throws -> WalletAuthorization
    func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount>
    func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance>
    func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction>
}
