import Domain
import Fakes
import Features
import Foundation
import Live
import SwiftUI

@main
struct OpenPersonalFinanceApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var onboarding: OnboardingModel
    @State private var diagnostics: DiagnosticsModel
    @State private var frequency: SyncFrequencyModel
    private let wakes: BackgroundWakes

    init() {
        let dependencies = Dependencies.live(
            financeData: Self.fakeFinanceData(),
            backgroundDelivery: Self.fakeBackgroundDelivery()
        )
        _onboarding = State(initialValue: OnboardingModel(source: dependencies.financeData))
        _diagnostics = State(
            initialValue: DiagnosticsModel(
                source: dependencies.financeData, history: dependencies.history, activity: dependencies.activity)
        )
        _frequency = State(initialValue: SyncFrequencyModel(scheduling: dependencies.schedule))
        wakes = dependencies.wakes
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(onboarding)
                .environment(diagnostics)
                .environment(frequency)
                .task { await frequency.load() }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { Task { await BackgroundRefresh.schedule() } }
        }
        .backgroundTask(.appRefresh(BackgroundRefresh.identifier)) { [wakes] in
            await BackgroundRefresh.schedule()
            await wakes.backgroundRefresh()
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

    // The Simulator has no FinanceKit background delivery.
    private static func fakeBackgroundDelivery() -> (any BackgroundDeliveryControl)? {
        #if targetEnvironment(simulator)
            return FakeBackgroundDelivery()
        #else
            return nil
        #endif
    }
}
