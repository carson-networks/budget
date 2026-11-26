import Domain
import Foundation

public actor InMemoryTokenStore: TokenStoring {
    private var tokensByAccount: [UUID: AccountTokens] = [:]

    public init() {}

    public func tokens(for accountID: UUID) -> AccountTokens {
        tokensByAccount[accountID] ?? .empty
    }

    public func save(_ tokens: AccountTokens, for accountID: UUID) {
        tokensByAccount[accountID] = tokens
    }

    public func markPendingFullResync(for accountID: UUID) {
        tokensByAccount[accountID] = AccountTokens(pendingFullResync: true)
    }

    public func removeAll() {
        tokensByAccount = [:]
    }
}
