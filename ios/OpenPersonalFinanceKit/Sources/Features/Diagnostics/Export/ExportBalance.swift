import Domain
import Foundation

nonisolated struct ExportBalance: Encodable {
    nonisolated struct Entry: Encodable {
        var amount: String
        var creditDebitIndicator: String
        var asOfDate: Date

        init(_ entry: WalletBalance.Entry) {
            amount = entry.amount.description
            creditDebitIndicator = entry.creditDebitIndicator.rawValue
            asOfDate = entry.asOfDate
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
}
