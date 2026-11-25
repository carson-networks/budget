import Domain
import FinanceKit
import os

package struct FinanceKitBackgroundDelivery: BackgroundDeliveryControl {
    private let store: FinanceStore

    package init() {
        store = .shared
    }

    package func apply(_ frequency: SyncFrequency) {
        guard let updateFrequency = FinanceKitMapping.updateFrequency(frequency) else {
            store.disableAllBackgroundDelivery()
            Log.logger.info("Background delivery off")
            return
        }
        store.enableBackgroundDelivery(
            for: WalletDataType.allCases.map(FinanceKitMapping.backgroundDataType),
            frequency: updateFrequency
        )
        Log.logger.info("Background delivery on, \(frequency.rawValue, privacy: .public)")
    }
}
