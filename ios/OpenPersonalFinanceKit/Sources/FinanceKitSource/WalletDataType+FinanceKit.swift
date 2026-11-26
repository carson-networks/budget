import Domain
import FinanceKit

extension WalletDataType {
    // For the delivery extension's entry point, the only code outside this target that sees FinanceKit's type.
    public init?(_ type: FinanceStore.BackgroundDataType) {
        guard let dataType = FinanceKitMapping.dataType(type) else { return nil }
        self = dataType
    }
}
