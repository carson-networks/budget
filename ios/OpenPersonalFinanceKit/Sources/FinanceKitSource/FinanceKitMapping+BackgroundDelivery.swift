import Domain
import FinanceKit

extension FinanceKitMapping {
    package static func dataType(_ type: FinanceStore.BackgroundDataType) -> WalletDataType? {
        switch type {
        case .accounts: .accounts
        case .accountBalances: .balances
        case .transactions: .transactions
        @unknown default: nil
        }
    }

    package static func backgroundDataType(_ type: WalletDataType) -> FinanceStore.BackgroundDataType {
        switch type {
        case .accounts: .accounts
        case .balances: .accountBalances
        case .transactions: .transactions
        }
    }

    // Nil for off, which disables delivery instead.
    package static func updateFrequency(_ frequency: SyncFrequency) -> FinanceStore.UpdateFrequency? {
        switch frequency {
        case .hourly: .hourly
        case .daily: .daily
        case .weekly: .weekly
        case .off: nil
        }
    }

    // Live passes the extension's values through without naming a FinanceKit type, so they are read here.
    package static func dataTypes(_ values: [some Sendable]) -> [WalletDataType] {
        values.compactMap { ($0 as? FinanceStore.BackgroundDataType).flatMap(dataType) }
    }
}
