import Foundation

public protocol TokenStoring: Sendable {
    // Accounts with saved tokens, in a stable order.
    func accountIDs() async throws -> [UUID]
    func tokens(for accountID: UUID) async throws -> AccountTokens
    func save(_ tokens: AccountTokens, for accountID: UUID) async throws
    func removeAll() async throws
}
