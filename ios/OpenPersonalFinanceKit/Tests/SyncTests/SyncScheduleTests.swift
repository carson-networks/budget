import Domain
import Fakes
import Sync
import Testing

struct SyncScheduleTests {
    private let delivery = FakeBackgroundDelivery()

    private func makeSchedule(saved: SyncFrequency? = nil) -> (schedule: SyncSchedule, store: InMemoryScheduleStore) {
        let store = InMemoryScheduleStore(frequency: saved)
        return (SyncSchedule(store: store, delivery: delivery), store)
    }

    @Test func isOffUntilAChoiceIsSaved() async throws {
        #expect(try await makeSchedule().schedule.frequency() == .off)
    }

    @Test(arguments: SyncFrequency.allCases)
    func appliesAndSavesAChoice(frequency: SyncFrequency) async throws {
        let (schedule, store) = makeSchedule()

        try await schedule.setFrequency(frequency)

        #expect(await delivery.applied == [frequency])
        #expect(await store.frequency() == frequency)
        #expect(try await schedule.frequency() == frequency)
    }

    @Test func reapplyAppliesTheSavedChoiceAgain() async throws {
        let schedule = makeSchedule(saved: .weekly).schedule

        try await schedule.reapply()

        #expect(await delivery.applied == [.weekly])
    }

    @Test func reapplyLeavesDeliveryAloneWithoutAChoice() async throws {
        try await makeSchedule().schedule.reapply()

        #expect(await delivery.applied.isEmpty)
    }
}
