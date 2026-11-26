import Domain
import Fakes
import Features
import SwiftUI

struct DiagnosticsWakeLogView: View {
    struct Destination: Hashable {}

    @Environment(DiagnosticsModel.self) private var model

    var body: some View {
        List {
            if model.wakeLogFailed {
                Text("The wake log could not be read. Pull to refresh.")
                    .foregroundStyle(.red)
            } else if model.wakes.isEmpty {
                Text("No background wakes yet. Pick a frequency in Settings, then close the app.")
                    .foregroundStyle(.secondary)
            }
            ForEach(Array(model.wakes.enumerated()), id: \.offset) { _, wake in
                WakeRow(wake: wake)
            }
        }
        .navigationTitle("Wake Log")
        .refreshable { await model.loadWakes() }
        .task { await model.loadWakes() }
    }
}

private struct WakeRow: View {
    let wake: WakeLogEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(Self.title(for: wake.trigger))
                Spacer()
                Text(wake.startedAt.formatted(date: .abbreviated, time: .standard))
                    .foregroundStyle(.secondary)
            }
            Text(Self.outcome(wake.outcome))
                .font(.caption)
            Text(Self.details(wake))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private static func title(for trigger: SyncTrigger) -> String {
        switch trigger {
        case .backgroundDelivery: "Background Delivery"
        case .backgroundRefresh: "Background Refresh"
        }
    }

    private static func outcome(_ outcome: WakeLogEntry.Outcome) -> String {
        switch outcome {
        case .succeeded(let count): "Read \(count) changes since the saved tokens."
        case .failed(.dataUnavailable): "Wallet data was locked."
        case .failed(.notAuthorized): "Wallet access was off."
        case .failed(.invalidToken): "A saved token was rejected."
        case .failed(.cancelled): "iOS stopped the wake before the read finished."
        case .failed(.other): "Reading Wallet data failed."
        }
    }

    private static func details(_ wake: WakeLogEntry) -> String {
        let duration = wake.duration.formatted(.units(allowed: [.seconds, .milliseconds], width: .abbreviated))
        let types = wake.dataTypes.isEmpty ? "no data types" : wake.dataTypes.map(\.rawValue).joined(separator: ", ")
        return "\(duration), \(types)"
    }
}

#Preview {
    NavigationStack {
        DiagnosticsWakeLogView()
    }
    .environment(
        DiagnosticsModel(
            source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample(),
            activity: FakeActivityReader.sample()))
}
