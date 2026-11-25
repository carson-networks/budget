import Domain
import Fakes
import Features
import SwiftUI

struct DiagnosticsView: View {
    @Environment(DiagnosticsModel.self) private var model

    var body: some View {
        List {
            Section("Wallet Access") {
                LabeledContent("Authorization", value: model.authorization.map { String(describing: $0) } ?? "Checking")
                if let failure = model.failure {
                    Text(Self.message(for: failure))
                        .foregroundStyle(.red)
                }
            }
            DiagnosticsTokensSection()
            DiagnosticsExportSection()
            Section("Background") {
                NavigationLink("Wake Log", value: WakeLogView.Destination())
            }
            ForEach(model.accounts) { summary in
                AccountSection(summary: summary)
            }
        }
        .navigationTitle("Diagnostics")
        .navigationDestination(for: DiagnosticsTransactionsView.Destination.self) { destination in
            DiagnosticsTransactionsView(
                transactions: model.accounts.first { $0.id == destination.accountID }?.transactions ?? []
            )
        }
        .navigationDestination(for: WakeLogView.Destination.self) { _ in
            WakeLogView()
        }
        .refreshable { await model.load() }
        .task { await model.loadIfNeeded() }
    }

    private static func message(for failure: DiagnosticsModel.Failure) -> String {
        switch failure {
        case .notAuthorized: "Wallet access is off."
        case .dataUnavailable: "Wallet data is locked. Unlock your iPhone and pull to refresh."
        case .invalidToken: "A saved token was rejected. Reset tokens and read again."
        case .other: "Reading Wallet data failed. Pull to refresh."
        }
    }
}

private struct AccountSection: View {
    let summary: DiagnosticsModel.AccountSummary

    var body: some View {
        let account = summary.account
        Section(account.displayName) {
            LabeledContent("ID", value: account.id.uuidString)
                .font(.caption.monospaced())
            LabeledContent("Kind", value: account.kind.rawValue)
            LabeledContent("Institution", value: account.institutionName)
            if let entry = summary.balance?.available {
                BalanceRow(title: "Available", entry: entry, currencyCode: account.currencyCode)
            }
            if let entry = summary.balance?.booked {
                BalanceRow(title: "Booked", entry: entry, currencyCode: account.currencyCode)
            }
            if let creditLimit = account.creditLimit {
                LabeledContent("Credit Limit", value: creditLimit.formatted(.currency(code: account.currencyCode)))
                    .privacySensitive()
            }
            ForEach(summary.statusCounts) { count in
                LabeledContent(count.status.rawValue.capitalized, value: count.count.formatted())
            }
            if let range = summary.dateRange {
                LabeledContent(
                    "Dates", value: (range.lowerBound..<range.upperBound).formatted(.interval.day().month().year()))
            }
            NavigationLink(
                "Transactions (\(summary.transactions.count))",
                value: DiagnosticsTransactionsView.Destination(accountID: account.id)
            )
        }
    }
}

private struct BalanceRow: View {
    let title: String
    let entry: WalletBalance.Entry
    let currencyCode: String

    var body: some View {
        LabeledContent(title) {
            Text("\(entry.amount.formatted(.currency(code: currencyCode))) \(entry.creditDebitIndicator.rawValue)")
        }
        .privacySensitive()
    }
}

#Preview {
    NavigationStack {
        DiagnosticsView()
    }
    .environment(
        DiagnosticsModel(
            source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample()))
    .environment(WakeLogModel(activity: FakeActivityReader.sample()))
}
