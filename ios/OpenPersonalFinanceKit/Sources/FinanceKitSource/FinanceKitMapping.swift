import Domain
import FinanceKit
import Foundation

package enum FinanceKitMapping {
    package static func account(_ account: Account) -> WalletAccount? {
        switch account {
        case .asset(let asset):
            WalletAccount(
                id: asset.id,
                displayName: asset.displayName,
                institutionName: asset.institutionName,
                kind: .asset,
                currencyCode: asset.currencyCode
            )
        case .liability(let liability):
            WalletAccount(
                id: liability.id,
                displayName: liability.displayName,
                institutionName: liability.institutionName,
                kind: .liability,
                currencyCode: liability.currencyCode,
                creditLimit: liability.creditInformation.creditLimit?.amount
            )
        @unknown default:
            nil
        }
    }

    package static func balance(_ balance: AccountBalance) -> WalletBalance {
        WalletBalance(
            id: balance.id,
            accountID: balance.accountID,
            currencyCode: balance.currencyCode,
            available: balance.available.flatMap(entry),
            booked: balance.booked.flatMap(entry)
        )
    }

    package static func entry(_ balance: Balance) -> WalletBalance.Entry? {
        guard let indicator = creditDebitIndicator(balance.creditDebitIndicator) else { return nil }
        return WalletBalance.Entry(
            amount: balance.amount.amount,
            creditDebitIndicator: indicator,
            asOfDate: balance.asOfDate
        )
    }

    // Memo transactions are dropped here so nothing downstream sees them.
    package static func transaction(_ transaction: Transaction) -> WalletTransaction? {
        guard let status = status(transaction.status),
            let indicator = creditDebitIndicator(transaction.creditDebitIndicator)
        else { return nil }
        return WalletTransaction(
            id: transaction.id,
            accountID: transaction.accountID,
            amount: transaction.transactionAmount.amount,
            currencyCode: transaction.transactionAmount.currencyCode,
            creditDebitIndicator: indicator,
            transactionDescription: transaction.transactionDescription,
            originalTransactionDescription: transaction.originalTransactionDescription,
            merchantName: transaction.merchantName,
            merchantCategoryCode: transaction.merchantCategoryCode.map { Int($0.rawValue) },
            transactionType: transactionType(transaction.transactionType),
            status: status,
            transactionDate: transaction.transactionDate,
            postedDate: transaction.postedDate
        )
    }

    package static func status(_ status: TransactionStatus) -> WalletTransaction.Status? {
        switch status {
        case .authorized: .authorized
        case .pending: .pending
        case .booked: .booked
        case .rejected: .rejected
        case .memo: nil
        @unknown default: nil
        }
    }

    package static func transactionType(_ type: TransactionType) -> WalletTransaction.TransactionType {
        switch type {
        case .unknown: .unknown
        case .adjustment: .adjustment
        case .atm: .atm
        case .billPayment: .billPayment
        case .check: .check
        case .deposit: .deposit
        case .directDeposit: .directDeposit
        case .dividend: .dividend
        case .fee: .fee
        case .interest: .interest
        case .pointOfSale: .pointOfSale
        case .transfer: .transfer
        case .withdrawal: .withdrawal
        case .standingOrder: .standingOrder
        case .directDebit: .directDebit
        case .loan: .loan
        case .refund: .refund
        @unknown default: .unknown
        }
    }

    package static func creditDebitIndicator(_ indicator: CreditDebitIndicator) -> WalletCreditDebitIndicator? {
        switch indicator {
        case .credit: .credit
        case .debit: .debit
        @unknown default: nil
        }
    }

    // FinanceKit may add statuses; until one is mapped, treat it as access the user has to grant in Settings.
    package static func authorization(_ status: AuthorizationStatus) -> WalletAuthorization {
        switch status {
        case .notDetermined: .notDetermined
        case .authorized: .authorized
        case .denied: .denied
        @unknown default: .denied
        }
    }

    // nil for `.off`, which disables delivery rather than choosing a frequency.
    package static func updateFrequency(_ frequency: SyncFrequency) -> FinanceStore.UpdateFrequency? {
        switch frequency {
        case .hourly: .hourly
        case .daily: .daily
        case .weekly: .weekly
        case .off: nil
        }
    }

    package static func dataType(_ type: FinanceStore.BackgroundDataType) -> WalletDataType? {
        switch type {
        case .accounts: .accounts
        case .accountBalances: .balances
        case .transactions: .transactions
        @unknown default: nil
        }
    }

    package static func dataError(for error: any Error) -> FinanceDataError? {
        guard let error = error as? FinanceError else { return nil }
        switch error {
        case .dataRestricted: return .dataUnavailable
        case .historyTokenInvalid: return .invalidToken
        default: return nil
        }
    }

    // A source that never yielded a chunk hands back an empty token, which means "start from the beginning".
    package static func historyToken(from data: Data?) throws -> FinanceStore.HistoryToken? {
        guard let data, !data.isEmpty else { return nil }
        do {
            return try JSONDecoder().decode(FinanceStore.HistoryToken.self, from: data)
        } catch {
            throw FinanceDataError.invalidToken
        }
    }

    package static func tokenData(_ token: FinanceStore.HistoryToken) throws -> Data {
        try JSONEncoder().encode(token)
    }

    package static func changeSet<Model: Identifiable, Element: Identifiable & Sendable>(
        _ changes: FinanceStore.Changes<Model>,
        transform: (Model) -> Element?
    ) throws -> ChangeSet<Element> where Model.ID == UUID, Element.ID == UUID {
        ChangeSet(
            inserted: changes.inserted.compactMap(transform),
            updated: changes.updated.compactMap(transform),
            deleted: changes.deleted,
            newToken: try tokenData(changes.newToken)
        )
    }
}
