import Foundation

struct WalletTransactionJSON: JSONShape {
    let value: WalletTransaction

    init(_ value: WalletTransaction) {
        self.value = value
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case accountID
        case amount
        case currencyCode
        case creditDebitIndicator
        case transactionDescription
        case originalTransactionDescription
        case merchantName
        case merchantCategoryCode
        case transactionType
        case status
        case transactionDate
        case postedDate
    }

    init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = WalletTransaction(
            id: try container.decode(UUID.self, forKey: .id),
            accountID: try container.decode(UUID.self, forKey: .accountID),
            amount: try DecimalStringCoding.decode(from: container, forKey: .amount),
            currencyCode: try container.decode(String.self, forKey: .currencyCode),
            creditDebitIndicator: try container.decodeRaw(
                WalletCreditDebitIndicator.self, forKey: .creditDebitIndicator),
            transactionDescription: try container.decode(String.self, forKey: .transactionDescription),
            originalTransactionDescription: try container.decode(String.self, forKey: .originalTransactionDescription),
            merchantName: try container.decodeIfPresent(String.self, forKey: .merchantName),
            merchantCategoryCode: try container.decodeIfPresent(Int.self, forKey: .merchantCategoryCode),
            transactionType: try container.decodeRaw(WalletTransaction.TransactionType.self, forKey: .transactionType),
            status: try container.decodeRaw(WalletTransaction.Status.self, forKey: .status),
            transactionDate: try container.decode(Date.self, forKey: .transactionDate),
            postedDate: try container.decodeIfPresent(Date.self, forKey: .postedDate)
        )
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(value.id, forKey: .id)
        try container.encode(value.accountID, forKey: .accountID)
        try DecimalStringCoding.encode(value.amount, to: &container, forKey: .amount)
        try container.encode(value.currencyCode, forKey: .currencyCode)
        try container.encode(value.creditDebitIndicator.rawValue, forKey: .creditDebitIndicator)
        try container.encode(value.transactionDescription, forKey: .transactionDescription)
        try container.encode(value.originalTransactionDescription, forKey: .originalTransactionDescription)
        try container.encodeIfPresent(value.merchantName, forKey: .merchantName)
        try container.encodeIfPresent(value.merchantCategoryCode, forKey: .merchantCategoryCode)
        try container.encode(value.transactionType.rawValue, forKey: .transactionType)
        try container.encode(value.status.rawValue, forKey: .status)
        try container.encode(value.transactionDate, forKey: .transactionDate)
        try container.encodeIfPresent(value.postedDate, forKey: .postedDate)
    }
}
