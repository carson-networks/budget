import Domain
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
