import Domain
import FinanceKit
import FinanceKitSource
import Foundation
import Testing

struct FinanceKitMappingTests {
    @Test(arguments: [
        (TransactionStatus.authorized, WalletTransaction.Status?.some(.authorized)),
        (.pending, .pending),
        (.booked, .booked),
        (.rejected, .rejected),
        (.memo, nil),
    ])
    func mapsTransactionStatusAndDropsMemo(status: TransactionStatus, expected: WalletTransaction.Status?) {
        #expect(FinanceKitMapping.status(status) == expected)
    }

    @Test(arguments: [
        (TransactionType.unknown, WalletTransaction.TransactionType.unknown),
        (.adjustment, .adjustment),
        (.atm, .atm),
        (.billPayment, .billPayment),
        (.check, .check),
        (.deposit, .deposit),
        (.directDeposit, .directDeposit),
        (.dividend, .dividend),
        (.fee, .fee),
        (.interest, .interest),
        (.pointOfSale, .pointOfSale),
        (.transfer, .transfer),
        (.withdrawal, .withdrawal),
        (.standingOrder, .standingOrder),
        (.directDebit, .directDebit),
        (.loan, .loan),
        (.refund, .refund),
    ])
    func mapsTransactionType(type: TransactionType, expected: WalletTransaction.TransactionType) {
        #expect(FinanceKitMapping.transactionType(type) == expected)
    }

    @Test func coversEveryTransactionType() {
        #expect(TransactionType.allCases.count == WalletTransaction.TransactionType.allCases.count)
    }

    @Test(arguments: [
        (CreditDebitIndicator.credit, WalletCreditDebitIndicator.credit),
        (.debit, .debit),
    ])
    func mapsCreditDebitIndicator(indicator: CreditDebitIndicator, expected: WalletCreditDebitIndicator) {
        #expect(FinanceKitMapping.creditDebitIndicator(indicator) == expected)
    }

    @Test(arguments: [
        (AuthorizationStatus.notDetermined, WalletAuthorization.notDetermined),
        (.authorized, .authorized),
        (.denied, .denied),
    ])
    func mapsAuthorizationStatus(status: AuthorizationStatus, expected: WalletAuthorization) {
        #expect(FinanceKitMapping.authorization(status) == expected)
    }

    @Test func mapsFinanceErrors() {
        #expect(FinanceKitMapping.dataError(for: FinanceError.dataRestricted(.financialData)) == .dataUnavailable)
        #expect(FinanceKitMapping.dataError(for: FinanceError.historyTokenInvalid) == .invalidToken)
        #expect(FinanceKitMapping.dataError(for: FinanceError.unknown) == nil)
        #expect(FinanceKitMapping.dataError(for: CancellationError()) == nil)
    }

    @Test func treatsMissingOrEmptyTokenAsStart() throws {
        #expect(try FinanceKitMapping.historyToken(from: nil) == nil)
        #expect(try FinanceKitMapping.historyToken(from: Data()) == nil)
    }

    @Test func rejectsCorruptToken() {
        #expect(throws: FinanceDataError.invalidToken) {
            try FinanceKitMapping.historyToken(from: Data("not-a-token".utf8))
        }
    }
}

struct FinanceKitBackgroundMappingTests {
    @Test(arguments: [
        (SyncFrequency.hourly, FinanceStore.UpdateFrequency?.some(.hourly)),
        (.daily, .daily),
        (.weekly, .weekly),
        (.off, nil),
    ])
    func mapsFrequencyAndTurnsOffForOff(frequency: SyncFrequency, expected: FinanceStore.UpdateFrequency?) {
        #expect(FinanceKitMapping.updateFrequency(frequency) == expected)
    }

    @Test(arguments: [
        (FinanceStore.BackgroundDataType.accounts, WalletDataType.accounts),
        (.accountBalances, .balances),
        (.transactions, .transactions),
    ])
    func mapsBackgroundDataTypes(type: FinanceStore.BackgroundDataType, expected: WalletDataType) {
        #expect(WalletDataType(type) == expected)
    }
}
