import Foundation

struct WalletBalanceJSON: JSONShape {
    let value: WalletBalance

    init(_ value: WalletBalance) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case accountID
        case currencyCode
        case available
        case booked
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = WalletBalance(
            id: try container.decode(UUID.self, forKey: .id),
            accountID: try container.decode(UUID.self, forKey: .accountID),
            currencyCode: try container.decode(String.self, forKey: .currencyCode),
            available: try container.decodeIfPresent(EntryJSON.self, forKey: .available)?.value,
            booked: try container.decodeIfPresent(EntryJSON.self, forKey: .booked)?.value
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(value.id, forKey: .id)
        try container.encode(value.accountID, forKey: .accountID)
        try container.encode(value.currencyCode, forKey: .currencyCode)
        try container.encodeIfPresent(value.available.map(EntryJSON.init), forKey: .available)
        try container.encodeIfPresent(value.booked.map(EntryJSON.init), forKey: .booked)
    }
}

private struct EntryJSON: JSONShape {
    let value: WalletBalance.Entry

    init(_ value: WalletBalance.Entry) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case amount
        case creditDebitIndicator
        case asOfDate
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = WalletBalance.Entry(
            amount: try DecimalStringCoding.decode(from: container, forKey: .amount),
            creditDebitIndicator: try container.decodeRaw(
                WalletCreditDebitIndicator.self, forKey: .creditDebitIndicator),
            asOfDate: try container.decode(Date.self, forKey: .asOfDate)
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try DecimalStringCoding.encode(value.amount, to: &container, forKey: .amount)
        try container.encode(value.creditDebitIndicator.rawValue, forKey: .creditDebitIndicator)
        try container.encode(value.asOfDate, forKey: .asOfDate)
    }
}
