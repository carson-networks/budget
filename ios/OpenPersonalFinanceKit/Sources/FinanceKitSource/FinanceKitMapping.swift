import Domain
import FinanceKit

package enum FinanceKitMapping {
    // FinanceKit may add statuses; until one is mapped, treat it as access the user has to grant in Settings.
    package static func authorization(_ status: AuthorizationStatus) -> WalletAuthorization {
        switch status {
        case .notDetermined: .notDetermined
        case .authorized: .authorized
        case .denied: .denied
        @unknown default: .denied
        }
    }

    package static func dataError(for error: any Error) -> FinanceDataError? {
        guard let error = error as? FinanceError else { return nil }
        switch error {
        case .dataRestricted: return .dataUnavailable
        default: return nil
        }
    }
}
