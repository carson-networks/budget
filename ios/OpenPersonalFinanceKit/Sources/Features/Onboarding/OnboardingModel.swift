import Domain
import Observation
import os

@Observable
public final class OnboardingModel {
    public enum State: Equatable, Sendable {
        case checking
        case unavailable
        case needsAuthorization
        case requesting
        case authorized
        case denied
        case restricted
        case failed
    }

    public private(set) var state: State = .checking
    private let source: any FinanceDataSource

    public init(source: any FinanceDataSource) {
        self.source = source
    }

    public func load() async {
        guard source.isDataAvailable() else {
            state = .unavailable
            return
        }
        state = .checking
        do {
            state = Self.state(for: try await source.authorizationStatus())
        } catch {
            fail(error)
        }
    }

    public func requestAccess() async {
        guard state == .needsAuthorization else { return }
        state = .requesting
        do {
            state = Self.state(for: try await source.requestAuthorization())
        } catch {
            fail(error)
        }
    }

    private func fail(_ error: any Error) {
        Log.logger.error("Wallet authorization failed: \(String(describing: error), privacy: .public)")
        state = .failed
    }

    private static func state(for authorization: WalletAuthorization) -> State {
        switch authorization {
        case .notDetermined: .needsAuthorization
        case .authorized: .authorized
        case .denied: .denied
        case .restricted: .restricted
        }
    }
}
