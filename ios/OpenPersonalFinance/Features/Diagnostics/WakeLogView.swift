import Domain
import Fakes
import Features
import SwiftUI

struct WakeLogView: View {
    struct Destination: Hashable {}

    @Environment(WakeLogModel.self) private var model

    var body: some View {
        List {
            if model.failed {
                Text("Couldn't read the wake log. Pull to refresh.")
                    .foregroundStyle(.red)
            }
            ForEach(Array(model.entries.enumerated()), id: \.offset) { _, entry in
                WakeLogRow(entry: entry)
            }
        }
        .overlay {
            if model.entries.isEmpty && !model.failed {
                ContentUnavailableView(
                    "No Wakes Yet",
                    systemImage: "moon.zzz",
                    description: Text("Wakes from background delivery and background refresh appear here.")
                )
            }
        }
        .navigationTitle("Wake Log")
        .refreshable { await model.load() }
        .task { await model.load() }
    }
}

private struct WakeLogRow: View {
    let entry: WakeLogEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(Self.title(for: entry.trigger))
                Spacer()
                Text(entry.date.formatted(date: .abbreviated, time: .shortened))
                    .foregroundStyle(.secondary)
            }
            Text(Self.summary(for: entry))
                .font(.caption)
            if !entry.dataTypes.isEmpty {
                Text(entry.dataTypes.map(\.rawValue).joined(separator: ", "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private static func title(for trigger: SyncTrigger) -> String {
        switch trigger {
        case .backgroundDelivery: "Background Delivery"
        case .backgroundRefresh: "Background Refresh"
        }
    }

    private static func summary(for entry: WakeLogEntry) -> String {
        switch entry.outcome {
        case .succeeded: "Read \(entry.accountCount) accounts, \(entry.changeCount) changes since the saved tokens."
        case .dataUnavailable: "Wallet data was locked."
        case .notAuthorized: "Wallet access was off."
        case .invalidToken: "A saved token was rejected."
        case .cancelled: "Stopped before it finished."
        case .failed: "Reading Wallet data failed."
        }
    }
}

#Preview {
    NavigationStack {
        WakeLogView()
    }
    .environment(WakeLogModel(activity: FakeActivityReader.sample()))
}
