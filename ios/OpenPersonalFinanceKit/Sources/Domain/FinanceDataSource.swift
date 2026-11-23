public protocol FinanceDataSource: Sendable {
    func isDataAvailable() -> Bool
    func authorizationStatus() async throws -> WalletAuthorization
    func requestAuthorization() async throws -> WalletAuthorization
}
