import Domain
import FinanceKitSource

public struct Dependencies: Sendable {
    public let financeData: any FinanceDataSource

    public static func live(financeData: (any FinanceDataSource)? = nil) -> Dependencies {
        Dependencies(financeData: financeData ?? FinanceKitDataSource())
    }
}
