import Domain
import ExtensionFoundation
import FinanceKit
import FinanceKitSource
import Live

@main
final class OpenPersonalFinanceDeliveryExtension: BackgroundDeliveryExtension {
    private let wakes = Dependencies.live().wakes

    required init() {}

    func didReceiveData(for types: [FinanceStore.BackgroundDataType]) async {
        await wakes.backgroundDelivery(types.compactMap(WalletDataType.init))
    }

    func willTerminate() async {
        await wakes.willTerminate()
    }
}
