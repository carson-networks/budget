// What screens use to choose how often the app syncs; where the choice is saved stays behind it.
public protocol SyncScheduling: Sendable {
    // Applies the saved choice again, since iOS keeps background delivery only while the app asks for it.
    func applySavedFrequency() async throws -> SyncFrequency
    func setFrequency(_ frequency: SyncFrequency) async throws
}
