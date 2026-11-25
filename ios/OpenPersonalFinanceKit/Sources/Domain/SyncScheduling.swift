// What screens use to choose how often background delivery runs; saving and applying the choice stays behind it.
public protocol SyncScheduling: Sendable {
    // The saved choice, or off if there is none.
    func frequency() async throws -> SyncFrequency
    // Applies the choice, then saves it, so what is saved is what was applied.
    func setFrequency(_ frequency: SyncFrequency) async throws
    // Applies the saved choice again; does nothing if there is none.
    func reapply() async throws
}
