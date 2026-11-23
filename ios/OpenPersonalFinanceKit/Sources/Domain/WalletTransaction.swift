import Foundation

public struct WalletTransaction: Identifiable, Decodable, Sendable {
    public enum Status: String, Decodable, Sendable, CaseIterable {
        case authorized
        case pending
        case booked
        case rejected
    }

    public enum TransactionType: String, Decodable, Sendable, CaseIterable {
        case unknown
        case adjustment
        case atm
        case billPayment
        case check
        case deposit
        case directDeposit
        case dividend
        case fee
        case interest
        case pointOfSale
        case transfer
        case withdrawal
        case standingOrder
        case directDebit
        case loan
        case refund
    }

    public let id: UUID
    public let accountID: UUID
    public let amount: Decimal
    public let currencyCode: String
    public let creditDebitIndicator: WalletCreditDebitIndicator
    public let transactionDescription: String
    public let originalTransactionDescription: String
    public let merchantName: String?
    public let merchantCategoryCode: Int?
    public let transactionType: TransactionType
    public let status: Status
    public let transactionDate: Date
    public let postedDate: Date?

    package init(
        id: UUID,
        accountID: UUID,
        amount: Decimal,
        currencyCode: String,
        creditDebitIndicator: WalletCreditDebitIndicator,
        transactionDescription: String,
        originalTransactionDescription: String,
        merchantName: String? = nil,
        merchantCategoryCode: Int? = nil,
        transactionType: TransactionType,
        status: Status,
        transactionDate: Date,
        postedDate: Date? = nil
    ) {
        self.id = id
        self.accountID = accountID
        self.amount = amount
        self.currencyCode = currencyCode
        self.creditDebitIndicator = creditDebitIndicator
        self.transactionDescription = transactionDescription
        self.originalTransactionDescription = originalTransactionDescription
        self.merchantName = merchantName
        self.merchantCategoryCode = merchantCategoryCode
        self.transactionType = transactionType
        self.status = status
        self.transactionDate = transactionDate
        self.postedDate = postedDate
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

    public init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        accountID = try container.decode(UUID.self, forKey: .accountID)
        amount = try DecimalStringCoding.decode(from: container, forKey: .amount)
        currencyCode = try container.decode(String.self, forKey: .currencyCode)
        creditDebitIndicator = try container.decode(
            WalletCreditDebitIndicator.self,
            forKey: .creditDebitIndicator
        )
        transactionDescription = try container.decode(String.self, forKey: .transactionDescription)
        originalTransactionDescription = try container.decode(
            String.self,
            forKey: .originalTransactionDescription
        )
        merchantName = try container.decodeIfPresent(String.self, forKey: .merchantName)
        merchantCategoryCode = try container.decodeIfPresent(Int.self, forKey: .merchantCategoryCode)
        transactionType = try container.decode(TransactionType.self, forKey: .transactionType)
        status = try container.decode(Status.self, forKey: .status)
        transactionDate = try container.decode(Date.self, forKey: .transactionDate)
        postedDate = try container.decodeIfPresent(Date.self, forKey: .postedDate)
    }
}
