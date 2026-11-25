import Domain
import Fakes
import Features
import Foundation
import Live
import SwiftUI

@main
struct OpenPersonalFinanceApp: App {
    @State private var onboarding: OnboardingModel
    @State private var diagnostics: DiagnosticsModel

    init() {
        let dependencies = Dependencies.live(financeData: Self.fakeFinanceData())
        _onboarding = State(initialValue: OnboardingModel(source: dependencies.financeData))
        _diagnostics = State(
            initialValue: DiagnosticsModel(
                source: dependencies.financeData, history: dependencies.history,
                fixtureEncoder: dependencies.fixtureEncoder)
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(onboarding)
                .environment(diagnostics)
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
