import Domain
import Foundation

nonisolated struct ExportAccountHistory: Encodable {
    var accountID: UUID
    var balances: [ExportChanges<ExportBalance>]
    var transactions: [ExportChanges<ExportTransaction>]

    init(_ history: WalletFixture.AccountHistory) {
        accountID = history.accountID
        balances = history.balances.map { ExportChanges($0, item: ExportBalance.init) }
        transactions = history.transactions.map { ExportChanges($0, item: ExportTransaction.init) }
    }
}
