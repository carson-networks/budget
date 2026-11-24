import Domain
import Fakes
import Features
import Foundation
import SwiftUI

struct DiagnosticsTransactionsView: View {
    struct Destination: Hashable {
        let accountID: UUID
    }

    let transactions: [WalletTransaction]

    var body: some View {
        List(transactions) { transaction in
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(transaction.transactionDescription)
                    Spacer()
                    Text(transaction.amount.formatted(.currency(code: transaction.currencyCode)))
                }
                Text(
                    "\(transaction.status.rawValue) · \(transaction.creditDebitIndicator.rawValue) · "
                        + transaction.transactionDate.formatted(date: .abbreviated, time: .shortened)
                )
                .font(.caption)
                .foregroundStyle(.secondary)
                if let postedDate = transaction.postedDate {
                    Text("Posted \(postedDate.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text(transaction.id.uuidString)
                    .font(.caption2.monospaced())
                    .foregroundStyle(.tertiary)
            }
            .privacySensitive()
        }
        .navigationTitle("Transactions")
    }
}

#Preview {
    @Previewable @State var model = DiagnosticsModel(
        source: FakeFinanceDataSource.sample(), tokens: InMemoryTokenStore())
    NavigationStack {
        DiagnosticsTransactionsView(transactions: model.accounts.first?.transactions ?? [])
    }
    .task { await model.load() }
}
