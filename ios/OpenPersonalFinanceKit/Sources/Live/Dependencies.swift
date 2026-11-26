import Domain
import FinanceKitSource
import Storage
import Sync

public struct Dependencies: Sendable {
    public let financeData: any FinanceDataSource
    public let history: any WalletHistoryReading
    public let schedule: any SyncScheduling
    public let activity: any ActivityReading
    public let wakes: BackgroundWakes

    public static func live(
        financeData: (any FinanceDataSource)? = nil,
        backgroundDelivery: (any BackgroundDeliveryControl)? = nil
    ) -> Dependencies {
        let directory = AppGroupDirectory.live()
        let financeData = financeData ?? FinanceKitDataSource()
        let tokens = TokenStore(directory: directory)
        let wakeLog = WakeLog(directory: directory)
        return Dependencies(
            financeData: financeData,
            history: WalletHistoryReader(source: financeData, tokens: tokens),
            schedule: SyncSchedule(
                store: ScheduleStore(directory: directory),
                delivery: backgroundDelivery ?? FinanceKitBackgroundDelivery()
            ),
            activity: ActivityReader(wakes: wakeLog),
            wakes: BackgroundWakes(
                probe: WakeProbe(source: financeData, tokens: tokens, log: wakeLog),
                work: BackgroundWork()
            )
        )
    }
}
