import Domain
import Fakes
import Features
import SwiftUI

struct DiagnosticsTokensSection: View {
    @Environment(DiagnosticsModel.self) private var model

    var body: some View {
        Section("Saved Tokens") {
            Group {
                Button("Read Again from Saved Token") { Task { await model.readAgainFromSavedTokens() } }
                Button("Reset Tokens", role: .destructive) { Task { await model.resetTokens() } }
            }
            .disabled(model.isReadingTokens || model.accounts.isEmpty)
            ForEach(model.tokenReads) { read in
                TokenReadRow(read: read)
            }
        }
    }
}

private struct TokenReadRow: View {
    let read: DiagnosticsModel.TokenRead

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(read.account.displayName)
            Text(read.fromSavedToken ? "Read from the saved token." : "No saved token, so read from the start.")
                .font(.caption)
                .foregroundStyle(.secondary)
            ChangeCountRow(title: "Account", count: read.accounts)
            ChangeCountRow(title: "Balances", count: read.balances)
            ChangeCountRow(title: "Transactions", count: read.transactions)
        }
    }
}

private struct ChangeCountRow: View {
    let title: String
    let count: DiagnosticsModel.ChangeCount

    var body: some View {
        LabeledContent(title) {
            Text("\(count.inserted) inserted, \(count.updated) updated, \(count.deleted) deleted")
        }
        .font(.caption)
    }
}

#Preview {
    @Previewable @State var model = DiagnosticsModel(
        source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample(),
        activity: FakeActivityReader.sample())
    List {
        DiagnosticsTokensSection()
    }
    .environment(model)
    .task { await model.load() }
}
