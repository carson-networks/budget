import Foundation

public protocol FinanceDataSource: Sendable {
    func isDataAvailable() -> Bool
    func authorizationStatus() async throws -> WalletAuthorization
    func requestAuthorization() async throws -> WalletAuthorization
    func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount>
    func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance>
    func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction>
}
