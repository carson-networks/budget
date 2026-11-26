import Domain

package struct SyncSchedule: SyncScheduling {
    // Background delivery stays off until a frequency is picked.
    private static let defaultFrequency = SyncFrequency.off

    private let store: any ScheduleStoring
    private let delivery: any BackgroundDeliveryControl

    package init(store: any ScheduleStoring, delivery: any BackgroundDeliveryControl) {
        self.store = store
        self.delivery = delivery
    }

    package func applySavedFrequency() async throws -> SyncFrequency {
        let frequency = try await store.frequency() ?? Self.defaultFrequency
        await delivery.apply(frequency)
        return frequency
    }

    // Saved first, so a choice that could not be saved is never left applied.
    package func setFrequency(_ frequency: SyncFrequency) async throws {
        try await store.save(frequency)
        await delivery.apply(frequency)
    }
}
