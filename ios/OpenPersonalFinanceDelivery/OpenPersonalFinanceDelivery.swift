import ExtensionFoundation
import FinanceKit

@main
final class OpenPersonalFinanceDeliveryExtension: BackgroundDeliveryExtension {
    required init() {}

    func didReceiveData(for types: [FinanceStore.BackgroundDataType]) async {}

    func willTerminate() async {}
}
