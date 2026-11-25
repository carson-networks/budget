import Domain

package actor InMemoryScheduleStore: ScheduleStoring {
    private var saved: SyncFrequency?

    package init(frequency: SyncFrequency? = nil) {
        saved = frequency
    }

    package func frequency() -> SyncFrequency? {
        saved
    }

    package func save(_ frequency: SyncFrequency) {
        saved = frequency
    }
}
