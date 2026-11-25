import Domain
import Foundation

struct FixtureBalance: Codable {
    struct Entry: Codable {
        var amount: String
        var creditDebitIndicator: String
        var asOfDate: Date

        func toDomain() throws -> WalletBalance.Entry {
            WalletBalance.Entry(
                amount: try FixtureMapping.money(amount, field: "amount"),
                creditDebitIndicator: try FixtureMapping.enumValue(creditDebitIndicator, field: "creditDebitIndicator"),
                asOfDate: asOfDate
            )
        }
    }

    var id: UUID
    var accountID: UUID
    var currencyCode: String
    var available: Entry?
    var booked: Entry?

    func toDomain() throws -> WalletBalance {
        WalletBalance(
            id: id,
            accountID: accountID,
            currencyCode: currencyCode,
            available: try available?.toDomain(),
            booked: try booked?.toDomain()
        )
    }
}
