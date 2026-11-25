import Foundation

public struct WalletTransaction: Identifiable, Sendable {
    public enum Status: String, Sendable, CaseIterable {
        case authorized
        case pending
        case booked
        case rejected
    }

    public enum TransactionType: String, Sendable, CaseIterable {
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
}
