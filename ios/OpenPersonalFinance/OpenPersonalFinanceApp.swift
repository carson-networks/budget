import Domain
import Fakes
import Features
import Foundation
import Live
import SwiftUI

@main
struct OpenPersonalFinanceApp: App {
    @State private var onboarding: OnboardingModel

    init() {
        let dependencies = Dependencies.live(financeData: Self.fakeFinanceData())
        _onboarding = State(initialValue: OnboardingModel(source: dependencies.financeData))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(onboarding)
        }
    }

    // Release builds on a device always read FinanceKit.
    private static func fakeFinanceData() -> (any FinanceDataSource)? {
        #if targetEnvironment(simulator)
            return FakeFinanceDataSource.sample(authorizationStatus: .notDetermined)
        #elseif DEBUG
            guard ProcessInfo.processInfo.arguments.contains("-useFakeFinanceData") else { return nil }
            return FakeFinanceDataSource.sample(authorizationStatus: .notDetermined)
        #else
            return nil
        #endif
    }
}
