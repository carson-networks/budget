import Domain
import FinanceKitSource
import Storage

public struct Dependencies: Sendable {
    public let financeData: any FinanceDataSource
    public let tokens: any TokenStoring

    public static func live(financeData: (any FinanceDataSource)? = nil) -> Dependencies {
        Dependencies(
            financeData: financeData ?? FinanceKitDataSource(),
            tokens: TokenStore(directory: .live())
        )
    }
}
