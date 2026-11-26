public protocol ScheduleStoring: Sendable {
    // nil until a frequency has been chosen.
    func frequency() async throws -> SyncFrequency?
    func save(_ frequency: SyncFrequency) async throws
}
