import Domain
import FinanceKit
import FinanceKitSource
import Testing

struct FinanceKitMappingTests {
    @Test(arguments: [
        (AuthorizationStatus.notDetermined, WalletAuthorization.notDetermined),
        (.authorized, .authorized),
        (.denied, .denied),
    ])
    func mapsAuthorizationStatus(status: AuthorizationStatus, expected: WalletAuthorization) {
        #expect(FinanceKitMapping.authorization(status) == expected)
    }

    @Test func mapsLockedDataToUnavailable() {
        #expect(FinanceKitMapping.dataError(for: FinanceError.dataRestricted(.financialData)) == .dataUnavailable)
    }

    @Test func leavesOtherErrorsUnmapped() {
        #expect(FinanceKitMapping.dataError(for: FinanceError.unknown) == nil)
        #expect(FinanceKitMapping.dataError(for: CancellationError()) == nil)
    }
}
