import Domain
import Fakes
import Features
import SwiftUI

struct ContentView: View {
    @Environment(OnboardingModel.self) private var onboarding

    var body: some View {
        if onboarding.state == .authorized {
            VersionView()
        } else {
            OnboardingView()
        }
    }
}

#Preview {
    ContentView()
        .environment(OnboardingModel(source: FakeFinanceDataSource(authorizationStatus: .notDetermined)))
}
