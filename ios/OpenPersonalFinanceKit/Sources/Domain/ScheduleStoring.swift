public protocol ScheduleStoring: Sendable {
    // Nil until a frequency has been chosen.
    func frequency() async throws -> SyncFrequency?
    func save(_ frequency: SyncFrequency) async throws
}
