import Domain
import FinanceKitSource
import Storage
import Sync

public struct Dependencies: Sendable {
    public let financeData: any FinanceDataSource
    public let history: any WalletHistoryReading
    public let fixtureEncoder: any FixtureEncoding

    public static func live(financeData: (any FinanceDataSource)? = nil) -> Dependencies {
        let financeData = financeData ?? FinanceKitDataSource()
        return Dependencies(
            financeData: financeData,
            history: WalletHistoryReader(source: financeData, tokens: TokenStore(directory: .live())),
            fixtureEncoder: FixtureFileCoder()
        )
    }
}
