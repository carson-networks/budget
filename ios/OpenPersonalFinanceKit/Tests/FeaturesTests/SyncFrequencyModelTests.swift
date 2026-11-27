import Domain
import Fakes
import Features
import Foundation
import Testing

struct SyncFrequencyModelTests {
    @Test func appliesTheSavedChoiceAtLaunchAndShowsIt() async {
        let schedule = FakeSyncSchedule(frequency: .daily)
        let model = SyncFrequencyModel(schedule: schedule)

        await model.applySavedFrequency()

        #expect(model.frequency == .daily)
        #expect(!model.failed)
        #expect(await schedule.applied == [.daily])
    }

    @Test func showsOffWithoutASavedChoice() async {
        let schedule = FakeSyncSchedule()
        let model = SyncFrequencyModel(schedule: schedule)

        await model.applySavedFrequency()

        #expect(model.frequency == .off)
        #expect(await schedule.applied.isEmpty)
    }

    @Test func selectingAppliesTheChoice() async {
        let schedule = FakeSyncSchedule()
        let model = SyncFrequencyModel(schedule: schedule)

        await model.select(.hourly)

        #expect(model.frequency == .hourly)
        #expect(!model.isSaving)
        #expect(await schedule.applied == [.hourly])
    }

    @Test func selectingTheCurrentChoiceDoesNothing() async {
        let schedule = FakeSyncSchedule(frequency: .weekly)
        let model = SyncFrequencyModel(schedule: schedule)
        await model.applySavedFrequency()

        await model.select(.weekly)

        #expect(await schedule.applied == [.weekly])
    }

    @Test func aFailedChoicePutsTheOldOneBack() async {
        let schedule = FakeSyncSchedule(frequency: .daily)
        let model = SyncFrequencyModel(schedule: schedule)
        await model.applySavedFrequency()

        await schedule.setInjectedError(CocoaError(.fileWriteUnknown))
        await model.select(.hourly)
        #expect(model.frequency == .daily)
        #expect(model.failed)

        await schedule.setInjectedError(nil)
        await model.select(.hourly)
        #expect(model.frequency == .hourly)
        #expect(!model.failed)
    }

    @Test func reportsAFailedLaunch() async {
        let schedule = FakeSyncSchedule(frequency: .daily)
        await schedule.setInjectedError(CocoaError(.fileReadUnknown))
        let model = SyncFrequencyModel(schedule: schedule)

        await model.applySavedFrequency()

        #expect(model.failed)
        #expect(model.frequency == .off)
    }
}
