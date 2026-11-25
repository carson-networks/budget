import Domain

package struct ActivityReader: ActivityReading {
    private let wakes: any LogStoring<WakeLogEntry>

    package init(wakes: any LogStoring<WakeLogEntry>) {
        self.wakes = wakes
    }

    package func recentWakes() async throws -> [WakeLogEntry] {
        try await wakes.entries().reversed()
    }
}
