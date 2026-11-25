import Domain
import Foundation

public actor InMemoryTokenStore: TokenStoring {
    private var tokensByAccount: [UUID: AccountTokens] = [:]

    public init() {}

    public func accountIDs() -> [UUID] {
        tokensByAccount.keys.sorted { $0.uuidString < $1.uuidString }
    }

    public func tokens(for accountID: UUID) -> AccountTokens {
        tokensByAccount[accountID] ?? .empty
    }

    public func save(_ tokens: AccountTokens, for accountID: UUID) {
        tokensByAccount[accountID] = tokens
    }

    public func removeAll() {
        tokensByAccount = [:]
    }
}
