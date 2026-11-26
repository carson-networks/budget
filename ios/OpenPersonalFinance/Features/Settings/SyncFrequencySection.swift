import Domain
import Fakes
import Features
import SwiftUI

struct SyncFrequencySection: View {
    @Environment(SyncFrequencyModel.self) private var model

    var body: some View {
        Section {
            Picker("Frequency", selection: selection) {
                ForEach(SyncFrequency.allCases, id: \.self) { frequency in
                    Text(Self.title(for: frequency)).tag(Optional(frequency))
                }
            }
            .disabled(model.frequency == nil)
            if model.failed {
                Text("The frequency could not be saved or applied.")
                    .foregroundStyle(.red)
            }
        } header: {
            Text("Background Delivery")
        } footer: {
            Text("How often Wallet may wake the app when its data changes. Each wake is listed in Diagnostics.")
        }
    }

    private var selection: Binding<SyncFrequency?> {
        Binding(
            get: { model.frequency },
            set: { newValue in
                guard let newValue else { return }
                Task { await model.select(newValue) }
            }
        )
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
    @Previewable @State var model = SyncFrequencyModel(scheduling: FakeSyncSchedule(frequency: .hourly))
    List {
        SyncFrequencySection()
    }
    .environment(model)
    .task { await model.load() }
}
