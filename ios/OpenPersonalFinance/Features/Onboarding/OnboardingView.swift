import Domain
import Fakes
import Features
import SwiftUI
import UIKit

struct OnboardingView: View {
    @Environment(OnboardingModel.self) private var model

    var body: some View {
        Group {
            switch model.state {
            case .checking, .requesting:
                ProgressView()
            case .needsAuthorization:
                ContentUnavailableView {
                    Label("Connect Wallet", systemImage: "wallet.bifold")
                } description: {
                    Text(
                        "OpenPersonalFinance reads the accounts, balances and transactions you choose in Wallet. "
                            + "Nothing leaves this iPhone until you add your budget server."
                    )
                } actions: {
                    Button("Continue") { Task { await model.requestAccess() } }
                        .buttonStyle(.borderedProminent)
                }
            case .unavailable:
                ContentUnavailableView(
                    "Wallet Data Unavailable",
                    systemImage: "wallet.bifold",
                    description: Text("Wallet account data isn't available on this iPhone or in your region.")
                )
            case .denied, .restricted:
                ContentUnavailableView {
                    Label("Wallet Access Off", systemImage: "lock")
                } description: {
                    Text("Turn on access to Wallet data for OpenPersonalFinance in Settings.")
                } actions: {
                    SettingsButton()
                }
            case .failed:
                ContentUnavailableView {
                    Label("Couldn't Check Wallet Access", systemImage: "exclamationmark.triangle")
                } description: {
                    Text("Unlock your iPhone and try again.")
                } actions: {
                    Button("Try Again") { Task { await model.load() } }
                }
            case .authorized:
                EmptyView()
            }
        }
        .task { await model.load() }
    }
}

private struct SettingsButton: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            Button("Open Settings") { openURL(url) }
                .buttonStyle(.borderedProminent)
        }
    }
}

#Preview("Not determined") {
    OnboardingView()
        .environment(OnboardingModel(source: FakeFinanceDataSource.sample(authorizationStatus: .notDetermined)))
}

#Preview("Denied") {
    OnboardingView()
        .environment(OnboardingModel(source: FakeFinanceDataSource.sample(authorizationStatus: .denied)))
}

#Preview("Unavailable") {
    OnboardingView()
        .environment(OnboardingModel(source: FakeFinanceDataSource.sample(isDataAvailable: false)))
}
