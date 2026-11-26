import Domain
import FinanceKit
import os

public struct FinanceKitBackgroundDelivery: BackgroundDeliveryControl {
    private static let allDataTypes: [FinanceStore.BackgroundDataType] = [.accounts, .accountBalances, .transactions]

    private let store: FinanceStore

    public init() {
        store = .shared
    }

    public func apply(_ frequency: SyncFrequency) async {
        guard let updateFrequency = FinanceKitMapping.updateFrequency(frequency) else {
            store.disableAllBackgroundDelivery()
            Log.logger.info("Background delivery disabled")
            return
        }
        store.enableBackgroundDelivery(for: Self.allDataTypes, frequency: updateFrequency)
        Log.logger.info("Background delivery enabled: \(frequency.rawValue, privacy: .public)")
    }
}
