import Domain
import Foundation

public actor FakeActivityReader: ActivityReading {
    private let wakes: [WakeLogEntry]

    package init(wakes: [WakeLogEntry]) {
        self.wakes = wakes
    }

    // Newest first, as the real reader returns them.
    public static func sample(now: Date = Date()) -> FakeActivityReader {
        FakeActivityReader(wakes: [
            WakeLogEntry(
                startedAt: now.addingTimeInterval(-600),
                duration: .milliseconds(820),
                trigger: .backgroundDelivery,
                dataTypes: [.transactions, .balances],
                outcome: .succeeded(changeCount: 3)
            ),
            WakeLogEntry(
                startedAt: now.addingTimeInterval(-4_200),
                duration: .milliseconds(140),
                trigger: .backgroundRefresh,
                dataTypes: [],
                outcome: .failed(.dataUnavailable)
            ),
        ])
    }

    public func recentWakes() -> [WakeLogEntry] {
        wakes
    }
}
