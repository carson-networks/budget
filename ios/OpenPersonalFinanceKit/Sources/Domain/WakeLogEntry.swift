import Foundation

// One background wake: what woke the app, and what a read since the saved tokens saw. Counts only, never amounts.
public struct WakeLogEntry: Equatable, Sendable {
    public enum Outcome: String, Sendable {
        case succeeded
        case dataUnavailable
        case notAuthorized
        case invalidToken
        case cancelled
        case failed
    }

    public let date: Date
    public let trigger: SyncTrigger
    public let dataTypes: [WalletDataType]
    public let outcome: Outcome
    public let accountCount: Int
    public let changeCount: Int

    package init(
        date: Date,
        trigger: SyncTrigger,
        dataTypes: [WalletDataType],
        outcome: Outcome,
        accountCount: Int,
        changeCount: Int
    ) {
        self.date = date
        self.trigger = trigger
        self.dataTypes = dataTypes
        self.outcome = outcome
        self.accountCount = accountCount
        self.changeCount = changeCount
    }
}
