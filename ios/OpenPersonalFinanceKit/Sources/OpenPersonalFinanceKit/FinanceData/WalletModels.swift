import Foundation

public enum WalletAuthorization: String, Codable, Sendable, CaseIterable {
    case notDetermined
    case denied
    case restricted
    case authorized
}

public enum FinanceDataError: Error, Equatable, Sendable {
    case notAuthorized
    /// FinanceKit data is protected while the device is locked.
    case dataUnavailable
    case invalidToken
}

public enum CreditDebitIndicator: String, Codable, Sendable {
    case credit
    case debit
}

public struct WalletAmount: Codable, Equatable, Sendable {
    /// Always non-negative; the direction is in `indicator`.
    public var amount: Decimal
    public var indicator: CreditDebitIndicator

    public init(amount: Decimal, indicator: CreditDebitIndicator) {
        self.amount = amount
        self.indicator = indicator
    }

    enum CodingKeys: String, CodingKey, CaseIterable {
        case amount, indicator
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
        amount = try container.decodeDecimal(forKey: .amount)
        indicator = try container.decode(CreditDebitIndicator.self, forKey: .indicator)
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeDecimal(amount, forKey: .amount)
        try container.encode(indicator, forKey: .indicator)
    }
}

public struct WalletAccount: Identifiable, Codable, Equatable, Sendable {
    public enum Kind: String, Codable, Sendable {
        case asset
        case liability
    }

    public var id: UUID
    public var displayName: String
    public var institutionName: String
    public var kind: Kind
    public var currencyCode: String
    /// Liability accounts only.
    public var creditLimit: Decimal?

    public init(
        id: UUID, displayName: String, institutionName: String, kind: Kind, currencyCode: String,
        creditLimit: Decimal? = nil
    ) {
        self.id = id
        self.displayName = displayName
        self.institutionName = institutionName
        self.kind = kind
        self.currencyCode = currencyCode
        self.creditLimit = creditLimit
    }

    enum CodingKeys: String, CodingKey, CaseIterable {
        case id, displayName, institutionName, kind, currencyCode, creditLimit
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        displayName = try container.decode(String.self, forKey: .displayName)
        institutionName = try container.decode(String.self, forKey: .institutionName)
        kind = try container.decode(Kind.self, forKey: .kind)
        currencyCode = try container.decode(String.self, forKey: .currencyCode)
        creditLimit = try container.decodeDecimalIfPresent(forKey: .creditLimit)
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(displayName, forKey: .displayName)
        try container.encode(institutionName, forKey: .institutionName)
        try container.encode(kind, forKey: .kind)
        try container.encode(currencyCode, forKey: .currencyCode)
        try container.encodeDecimalIfPresent(creditLimit, forKey: .creditLimit)
    }
}

public struct WalletBalance: Identifiable, Codable, Equatable, Sendable {
    public var id: UUID
    public var accountID: UUID
    public var available: WalletAmount?
    public var booked: WalletAmount?
    public var asOf: Date

    public init(id: UUID, accountID: UUID, available: WalletAmount?, booked: WalletAmount?, asOf: Date) {
        self.id = id
        self.accountID = accountID
        self.available = available
        self.booked = booked
        self.asOf = asOf
    }

    enum CodingKeys: String, CodingKey, CaseIterable {
        case id, accountID, available, booked, asOf
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        accountID = try container.decode(UUID.self, forKey: .accountID)
        available = try container.decodeIfPresent(WalletAmount.self, forKey: .available)
        booked = try container.decodeIfPresent(WalletAmount.self, forKey: .booked)
        asOf = try container.decode(Date.self, forKey: .asOf)
    }
}

public struct WalletTransaction: Identifiable, Codable, Equatable, Sendable {
    public enum Status: String, Codable, Sendable, CaseIterable {
        case authorized
        case pending
        case booked
        case rejected
        case memo
    }

    public enum TransactionType: String, Codable, Sendable, CaseIterable {
        case adjustment
        case atm
        case billPayment
        case check
        case deposit
        case directDebit
        case directDeposit
        case dividend
        case fee
        case interest
        case loan
        case pointOfSale
        case refund
        case standingOrder
        case transfer
        case unknown
        case withdrawal
    }

    public var id: UUID
    public var accountID: UUID
    public var amount: WalletAmount
    public var currencyCode: String
    public var transactionDescription: String
    public var originalTransactionDescription: String
    public var merchantName: String?
    public var merchantCategoryCode: Int?
    public var transactionDate: Date
    public var postedDate: Date?
    public var status: Status
    public var transactionType: TransactionType

    public init(
        id: UUID, accountID: UUID, amount: WalletAmount, currencyCode: String, transactionDescription: String,
        originalTransactionDescription: String, merchantName: String? = nil, merchantCategoryCode: Int? = nil,
        transactionDate: Date, postedDate: Date? = nil, status: Status, transactionType: TransactionType
    ) {
        self.id = id
        self.accountID = accountID
        self.amount = amount
        self.currencyCode = currencyCode
        self.transactionDescription = transactionDescription
        self.originalTransactionDescription = originalTransactionDescription
        self.merchantName = merchantName
        self.merchantCategoryCode = merchantCategoryCode
        self.transactionDate = transactionDate
        self.postedDate = postedDate
        self.status = status
        self.transactionType = transactionType
    }

    enum CodingKeys: String, CodingKey, CaseIterable {
        case id, accountID, amount, currencyCode, transactionDescription, originalTransactionDescription
        case merchantName, merchantCategoryCode, transactionDate, postedDate, status, transactionType
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.strictContainer(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        accountID = try container.decode(UUID.self, forKey: .accountID)
        amount = try container.decode(WalletAmount.self, forKey: .amount)
        currencyCode = try container.decode(String.self, forKey: .currencyCode)
        transactionDescription = try container.decode(String.self, forKey: .transactionDescription)
        originalTransactionDescription = try container.decode(String.self, forKey: .originalTransactionDescription)
        merchantName = try container.decodeIfPresent(String.self, forKey: .merchantName)
        merchantCategoryCode = try container.decodeIfPresent(Int.self, forKey: .merchantCategoryCode)
        transactionDate = try container.decode(Date.self, forKey: .transactionDate)
        postedDate = try container.decodeIfPresent(Date.self, forKey: .postedDate)
        status = try container.decode(Status.self, forKey: .status)
        transactionType = try container.decode(TransactionType.self, forKey: .transactionType)
    }
}
