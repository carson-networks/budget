import Domain
import Fakes
import Foundation
import Sync
import Testing

struct ActivityReaderTests {
    @Test func listsWakesNewestFirst() async throws {
        let log = InMemoryLogStore<WakeLogEntry>()
        for changeCount in 1...3 {
            await log.append(
                WakeLogEntry(
                    date: Date(timeIntervalSince1970: 1_800_000_000 + Double(changeCount)),
                    trigger: .backgroundDelivery,
                    dataTypes: [.transactions],
                    outcome: .succeeded,
                    accountCount: 1,
                    changeCount: changeCount
                )
            )
        }

        let wakes = try await ActivityReader(wakes: log).recentWakes()

        #expect(wakes.map(\.changeCount) == [3, 2, 1])
    }
}
