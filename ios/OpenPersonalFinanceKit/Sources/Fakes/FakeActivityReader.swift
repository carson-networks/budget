import Domain
import Foundation

public actor FakeActivityReader: ActivityReading {
    private let wakes: [WakeLogEntry]
    private var injectedError: (any Error)?

    // Newest first, as recentWakes returns them.
    package init(wakes: [WakeLogEntry]) {
        self.wakes = wakes
    }

    public static func sample() -> FakeActivityReader {
        let now = Date.now
        return FakeActivityReader(wakes: [
            WakeLogEntry(
                date: now.addingTimeInterval(-600),
                trigger: .backgroundDelivery,
                dataTypes: [.transactions, .balances],
                outcome: .succeeded,
                accountCount: 2,
                changeCount: 3
            ),
            WakeLogEntry(
                date: now.addingTimeInterval(-4_200),
                trigger: .backgroundRefresh,
                dataTypes: [],
                outcome: .dataUnavailable,
                accountCount: 0,
                changeCount: 0
            ),
            WakeLogEntry(
                date: now.addingTimeInterval(-7_800),
                trigger: .backgroundDelivery,
                dataTypes: [.accounts],
                outcome: .succeeded,
                accountCount: 2,
                changeCount: 0
            ),
        ])
    }

    public func recentWakes() throws -> [WakeLogEntry] {
        if let injectedError {
            throw injectedError
        }
        return wakes
    }

    package func setInjectedError(_ error: (any Error)?) {
        injectedError = error
    }
}
