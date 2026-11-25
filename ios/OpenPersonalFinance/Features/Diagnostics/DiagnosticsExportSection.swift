import Domain
import Fakes
import Features
import SwiftUI

struct DiagnosticsExportSection: View {
    @Environment(DiagnosticsModel.self) private var model
    @State private var redact = true

    var body: some View {
        Section {
            Toggle("Redact", isOn: $redact)
            ShareLink(item: model.fixtureExport(redacted: redact), preview: SharePreview("Wallet Fixture")) {
                Label("Export Fixture", systemImage: "square.and.arrow.up")
            }
            .disabled(!model.canExport)
        } header: {
            Text("Fixture")
        } footer: {
            Text(
                "Exports what this screen read. Redact replaces descriptions and merchant names with placeholders "
                    + "and scales every amount by a random factor."
            )
        }
    }
}

#Preview {
    @Previewable @State var model = DiagnosticsModel(
        source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample(),
        fixtureEncoder: FixtureFiles.encoder)
    List {
        DiagnosticsExportSection()
    }
    .environment(model)
    .task { await model.load() }
}
