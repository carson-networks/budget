import ExtensionFoundation
import FinanceKit
import Live

@main
final class OpenPersonalFinanceDeliveryExtension: BackgroundDeliveryExtension {
    private let wakes = Dependencies.live().wakes

    required init() {}

    func didReceiveData(for types: [FinanceStore.BackgroundDataType]) async {
        await wakes.didReceiveData(for: types)
    }

    func willTerminate() async {
        await wakes.willTerminate()
    }
}
