import Foundation

struct FixtureTransaction: Codable {
    var id: UUID
    var accountID: UUID
    var amount: String
    var currencyCode: String
    var creditDebitIndicator: String
    var transactionDescription: String
    var originalTransactionDescription: String
    var merchantName: String?
    var merchantCategoryCode: Int?
    var transactionType: String
    var status: String
    var transactionDate: Date
    var postedDate: Date?

    init(_ transaction: WalletTransaction) {
        id = transaction.id
        accountID = transaction.accountID
        amount = transaction.amount.description
        currencyCode = transaction.currencyCode
        creditDebitIndicator = transaction.creditDebitIndicator.rawValue
        transactionDescription = transaction.transactionDescription
        originalTransactionDescription = transaction.originalTransactionDescription
        merchantName = transaction.merchantName
        merchantCategoryCode = transaction.merchantCategoryCode
        transactionType = transaction.transactionType.rawValue
        status = transaction.status.rawValue
        transactionDate = transaction.transactionDate
        postedDate = transaction.postedDate
    }

    func toDomain() throws -> WalletTransaction {
        WalletTransaction(
            id: id,
            accountID: accountID,
            amount: try FixtureMapping.money(amount, field: "amount"),
            currencyCode: currencyCode,
            creditDebitIndicator: try FixtureMapping.enumValue(creditDebitIndicator, field: "creditDebitIndicator"),
            transactionDescription: transactionDescription,
            originalTransactionDescription: originalTransactionDescription,
            merchantName: merchantName,
            merchantCategoryCode: merchantCategoryCode,
            transactionType: try FixtureMapping.enumValue(transactionType, field: "transactionType"),
            status: try FixtureMapping.enumValue(status, field: "status"),
            transactionDate: transactionDate,
            postedDate: postedDate
        )
    }
}
