import Domain
import Foundation

nonisolated struct ExportTransaction: Encodable {
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
}
