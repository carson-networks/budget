import Domain
import Foundation

struct FixtureAccountHistory: Codable {
    var accountID: UUID
    var balances: [FixtureChanges<FixtureBalance>]?
    var transactions: [FixtureChanges<FixtureTransaction>]?

    func toDomain() throws -> WalletFixture.AccountHistory {
        WalletFixture.AccountHistory(
            accountID: accountID,
            balances: try (balances ?? []).map { try $0.toDomain { try $0.toDomain() } },
            transactions: try (transactions ?? []).map { try $0.toDomain { try $0.toDomain() } }
        )
    }
}
