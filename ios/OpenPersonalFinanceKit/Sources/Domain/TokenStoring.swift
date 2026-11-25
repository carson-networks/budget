import Foundation

public protocol TokenStoring: Sendable {
    func tokens(for accountID: UUID) async throws -> AccountTokens
    func save(_ tokens: AccountTokens, for accountID: UUID) async throws
    func removeAll() async throws
}
