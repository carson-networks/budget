import Domain
import FinanceKit
import FinanceKitSource
import Testing

struct BackgroundDeliveryMappingTests {
    @Test(arguments: [
        (FinanceStore.BackgroundDataType.accounts, WalletDataType.accounts),
        (.accountBalances, .balances),
        (.transactions, .transactions),
    ])
    func mapsDataTypesBothWays(type: FinanceStore.BackgroundDataType, expected: WalletDataType) {
        #expect(FinanceKitMapping.dataType(type) == expected)
        #expect(FinanceKitMapping.backgroundDataType(expected) == type)
    }

    @Test(arguments: [
        (SyncFrequency.hourly, FinanceStore.UpdateFrequency?.some(.hourly)),
        (.daily, .daily),
        (.weekly, .weekly),
        (.off, nil),
    ])
    func mapsFrequency(frequency: SyncFrequency, expected: FinanceStore.UpdateFrequency?) {
        #expect(FinanceKitMapping.updateFrequency(frequency) == expected)
    }

    @Test func readsTheExtensionsValuesAndIgnoresAnythingElse() {
        let delivered: [FinanceStore.BackgroundDataType] = [.transactions, .accountBalances]
        #expect(FinanceKitMapping.dataTypes(delivered) == [.transactions, .balances])
        #expect(FinanceKitMapping.dataTypes(["transactions"]).isEmpty)
    }
}
