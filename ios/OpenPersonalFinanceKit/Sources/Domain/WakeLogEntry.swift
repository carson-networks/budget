import Foundation

public struct WakeLogEntry: Sendable {
    public enum Failure: String, Sendable, CaseIterable {
        case dataUnavailable
        case notAuthorized
        case invalidToken
        case cancelled
        case other
    }

    public enum Outcome: Sendable {
        case succeeded(changeCount: Int)
        case failed(Failure)
    }

    public let startedAt: Date
    public let duration: Duration
    public let trigger: SyncTrigger
    public let dataTypes: [WalletDataType]
    public let outcome: Outcome

    package init(
        startedAt: Date,
        duration: Duration,
        trigger: SyncTrigger,
        dataTypes: [WalletDataType],
        outcome: Outcome
    ) {
        self.startedAt = startedAt
        self.duration = duration
        self.trigger = trigger
        self.dataTypes = dataTypes
        self.outcome = outcome
    }
}
