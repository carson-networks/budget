import Domain
import Fakes
import Sync
import Testing

struct SyncScheduleTests {
    private let store = InMemoryScheduleStore()
    private let delivery = FakeBackgroundDelivery()

    private var schedule: SyncSchedule {
        SyncSchedule(store: store, delivery: delivery)
    }

    @Test func appliesOffUntilAFrequencyIsPicked() async throws {
        #expect(try await schedule.applySavedFrequency() == .off)
        #expect(await delivery.applied == [.off])
    }

    @Test func reappliesTheSavedFrequency() async throws {
        try await store.save(.weekly)
        #expect(try await schedule.applySavedFrequency() == .weekly)
        #expect(await delivery.applied == [.weekly])
    }

    @Test func setFrequencySavesThenApplies() async throws {
        try await schedule.setFrequency(.hourly)
        #expect(try await store.frequency() == .hourly)
        #expect(await delivery.applied == [.hourly])
    }

    @Test func aChoiceThatCannotBeSavedIsNotApplied() async throws {
        await store.setInjectedError(.dataUnavailable)
        await #expect(throws: FinanceDataError.dataUnavailable) { try await schedule.setFrequency(.daily) }
        #expect(await delivery.applied.isEmpty)
    }
}
