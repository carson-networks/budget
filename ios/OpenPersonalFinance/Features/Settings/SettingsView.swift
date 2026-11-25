import Domain
import Fakes
import Features
import SwiftUI

struct SettingsView: View {
    private enum Destination: Hashable {
        case diagnostics
    }

    private let version = AppVersion.current

    var body: some View {
        NavigationStack {
            List {
                SyncFrequencySection()
                Section {
                    NavigationLink("Diagnostics", value: Destination.diagnostics)
                }
                Section {
                    LabeledContent("Version", value: version.displayString)
                }
            }
            .navigationTitle("Settings")
            .navigationDestination(for: Destination.self) { _ in
                DiagnosticsView()
            }
        }
    }
}

#Preview {
    SettingsView()
        .environment(SyncFrequencyModel(schedule: FakeSyncSchedule(frequency: .daily)))
        .environment(
            DiagnosticsModel(
                source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        )
        .environment(WakeLogModel(activity: FakeActivityReader.sample()))
}
