import Domain
import os

package struct SyncSchedule: SyncScheduling {
    private let store: any ScheduleStoring
    private let delivery: any BackgroundDeliveryControl

    package init(store: any ScheduleStoring, delivery: any BackgroundDeliveryControl) {
        self.store = store
        self.delivery = delivery
    }

    package func frequency() async throws -> SyncFrequency {
        try await store.frequency() ?? .off
    }

    package func setFrequency(_ frequency: SyncFrequency) async throws {
        await delivery.apply(frequency)
        try await store.save(frequency)
        Log.logger.info("Background delivery set to \(frequency.rawValue, privacy: .public)")
    }

    // Run at launch, so background delivery matches the saved choice after a reinstall or restore.
    package func reapply() async throws {
        guard let saved = try await store.frequency() else { return }
        await delivery.apply(saved)
    }
}
