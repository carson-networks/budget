import Foundation

public struct WalletBalance: Identifiable, Decodable, Sendable {
    public struct Entry: Decodable, Sendable {
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

        private enum CodingKeys: String, CodingKey, CaseIterable {
            case amount
            case creditDebitIndicator
            case asOfDate
        }

        public init(from decoder: any Decoder) throws {
            try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
            let container = try decoder.container(keyedBy: CodingKeys.self)
            amount = try DecimalStringCoding.decode(from: container, forKey: .amount)
            creditDebitIndicator = try container.decode(
                WalletCreditDebitIndicator.self,
                forKey: .creditDebitIndicator
            )
            asOfDate = try container.decode(Date.self, forKey: .asOfDate)
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

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case accountID
        case currencyCode
        case available
        case booked
    }

    public init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        accountID = try container.decode(UUID.self, forKey: .accountID)
        currencyCode = try container.decode(String.self, forKey: .currencyCode)
        available = try container.decodeIfPresent(Entry.self, forKey: .available)
        booked = try container.decodeIfPresent(Entry.self, forKey: .booked)
    }
}
