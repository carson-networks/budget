import Domain
import Foundation

struct FixtureBalance: Codable {
    struct Entry: Codable {
        var amount: String
        var creditDebitIndicator: String
        var asOfDate: Date

        init(_ entry: WalletBalance.Entry) {
            amount = entry.amount.description
            creditDebitIndicator = entry.creditDebitIndicator.rawValue
            asOfDate = entry.asOfDate
        }

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

    init(_ balance: WalletBalance) {
        id = balance.id
        accountID = balance.accountID
        currencyCode = balance.currencyCode
        available = balance.available.map(Entry.init)
        booked = balance.booked.map(Entry.init)
    }

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
