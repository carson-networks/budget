import Domain
import Fakes
import Features
import SwiftUI

struct SyncFrequencySection: View {
    @Environment(SyncFrequencyModel.self) private var model

    var body: some View {
        Section {
            Picker(
                "Background Delivery",
                selection: Binding(get: { model.frequency }, set: { value in Task { await model.select(value) } })
            ) {
                ForEach(SyncFrequency.allCases, id: \.self) { frequency in
                    Text(Self.title(for: frequency))
                }
            }
            .disabled(model.isSaving)
            if model.failed {
                Text("Couldn't change background delivery. Try again.")
                    .foregroundStyle(.red)
            }
        } header: {
            Text("Background")
        } footer: {
            Text(
                "How soon Wallet wakes OpenPersonalFinance after your data changes. "
                    + "Each wake is listed in the wake log under Diagnostics."
            )
        }
    }

    private static func title(for frequency: SyncFrequency) -> String {
        switch frequency {
        case .hourly: "Hourly"
        case .daily: "Daily"
        case .weekly: "Weekly"
        case .off: "Off"
        }
    }
}

#Preview {
    List {
        SyncFrequencySection()
    }
    .environment(SyncFrequencyModel(schedule: FakeSyncSchedule(frequency: .hourly)))
}
