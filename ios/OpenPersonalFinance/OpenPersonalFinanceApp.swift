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
    @State private var syncFrequency: SyncFrequencyModel
    @State private var wakeLog: WakeLogModel
    private let wakes: BackgroundWakes

    init() {
        let dependencies = Self.dependencies()
        _onboarding = State(initialValue: OnboardingModel(source: dependencies.financeData))
        _diagnostics = State(
            initialValue: DiagnosticsModel(
                source: dependencies.financeData, history: dependencies.history)
        )
        _syncFrequency = State(initialValue: SyncFrequencyModel(schedule: dependencies.schedule))
        _wakeLog = State(initialValue: WakeLogModel(activity: dependencies.activity))
        wakes = dependencies.wakes
    }

    var body: some Scene {
        let wakes = wakes
        WindowGroup {
            ContentView()
                .environment(onboarding)
                .environment(diagnostics)
                .environment(syncFrequency)
                .environment(wakeLog)
                .task { await syncFrequency.applySavedFrequency() }
                .task { await BackgroundRefresh.schedule() }
        }
        .backgroundTask(.appRefresh(BackgroundRefresh.identifier)) {
            // Scheduled first, so the next refresh is requested even if this one runs out of time.
            await BackgroundRefresh.schedule()
            await wakes.backgroundRefresh()
        }
    }

    // Release builds on a device always read FinanceKit.
    private static func dependencies() -> Dependencies {
        #if targetEnvironment(simulator)
            return fakeDependencies()
        #elseif DEBUG
            guard ProcessInfo.processInfo.arguments.contains("-useFakeFinanceData") else { return .live() }
            return fakeDependencies()
        #else
            return .live()
        #endif
    }

    private static func fakeDependencies() -> Dependencies {
        .live(
            financeData: FakeFinanceDataSource.sample(authorizationStatus: .notDetermined),
            backgroundDelivery: FakeBackgroundDelivery()
        )
    }
}
