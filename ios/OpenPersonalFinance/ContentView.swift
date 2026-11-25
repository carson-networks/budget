import Domain
import Fakes
import Features
import SwiftUI

struct ContentView: View {
    @Environment(OnboardingModel.self) private var onboarding

    var body: some View {
        if onboarding.state == .authorized {
            TabView {
                Tab("Settings", systemImage: "gear") {
                    SettingsView()
                }
            }
        } else {
            OnboardingView()
        }
    }
}

#Preview {
    let source = FakeFinanceDataSource.sample(authorizationStatus: .notDetermined)
    ContentView()
        .environment(OnboardingModel(source: source))
        .environment(
            DiagnosticsModel(
                source: source, history: FakeWalletHistoryReader.sample())
        )
        .environment(SyncFrequencyModel(schedule: FakeSyncSchedule()))
        .environment(WakeLogModel(activity: FakeActivityReader.sample()))
}
