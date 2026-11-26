import Domain
import Fakes
import Features
import Testing

struct SyncFrequencyModelTests {
    @Test func loadAppliesTheSavedFrequency() async {
        let scheduling = FakeSyncSchedule(frequency: .daily)
        let model = SyncFrequencyModel(scheduling: scheduling)
        #expect(model.frequency == nil)

        await model.load()
        #expect(model.frequency == .daily)
        #expect(!model.failed)
        #expect(await scheduling.applied == [.daily])
    }

    @Test func selectSavesAndApplies() async {
        let scheduling = FakeSyncSchedule()
        let model = SyncFrequencyModel(scheduling: scheduling)
        await model.load()

        await model.select(.hourly)
        await model.select(.hourly)
        #expect(model.frequency == .hourly)
        #expect(await scheduling.applied == [.off, .hourly])
    }

    @Test func aFailedSavePutsThePreviousChoiceBack() async {
        let scheduling = FakeSyncSchedule(frequency: .weekly)
        let model = SyncFrequencyModel(scheduling: scheduling)
        await model.load()

        await scheduling.setInjectedError(.dataUnavailable)
        await model.select(.hourly)
        #expect(model.frequency == .weekly)
        #expect(model.failed)

        await scheduling.setInjectedError(nil)
        await model.select(.hourly)
        #expect(model.frequency == .hourly)
        #expect(!model.failed)
    }

    @Test func aFailedLoadLeavesThePickerUnset() async {
        let scheduling = FakeSyncSchedule()
        await scheduling.setInjectedError(.dataUnavailable)
        let model = SyncFrequencyModel(scheduling: scheduling)

        await model.load()
        #expect(model.frequency == nil)
        #expect(model.failed)
    }
}
