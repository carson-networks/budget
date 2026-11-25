import Foundation

public struct WalletBalance: Identifiable, Sendable {
    public struct Entry: Sendable {
        public let amount: Decimal
        public let creditDebitIndicator: WalletCreditDebitIndicator
        public let asOfDate: Date

        package init(
            amount: Decimal,
            creditDebitIndicator: WalletCreditDebitIndicator,
            asOfDate: Date
        ) {
            self.amount = amount
            self.creditDebitIndicator = creditDebitIndicator
            self.asOfDate = asOfDate
        }
    }

    public let id: UUID
    public let accountID: UUID
    public let currencyCode: String
    public let available: Entry?
    public let booked: Entry?

    package init(
        id: UUID,
        accountID: UUID,
        currencyCode: String,
        available: Entry? = nil,
        booked: Entry? = nil
    ) {
        self.id = id
        self.accountID = accountID
        self.currencyCode = currencyCode
        self.available = available
        self.booked = booked
    }
}
