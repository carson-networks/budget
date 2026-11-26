import Domain
import Observation
import os

@Observable
public final class SyncFrequencyModel {
    // nil until the saved choice has been read.
    public private(set) var frequency: SyncFrequency?
    public private(set) var failed = false
    private let scheduling: any SyncScheduling

    public init(scheduling: any SyncScheduling) {
        self.scheduling = scheduling
    }

    // Called at launch, so the saved choice is applied again each time the app starts.
    public func load() async {
        do {
            frequency = try await scheduling.applySavedFrequency()
            failed = false
        } catch {
            Log.logger.error("Applying the saved frequency failed: \(String(describing: error), privacy: .public)")
            failed = true
        }
    }

    // Shows the choice at once and puts the previous one back if it could not be saved.
    public func select(_ newFrequency: SyncFrequency) async {
        guard newFrequency != frequency else { return }
        let previous = frequency
        frequency = newFrequency
        do {
            try await scheduling.setFrequency(newFrequency)
            failed = false
        } catch {
            Log.logger.error("Saving the frequency failed: \(String(describing: error), privacy: .public)")
            frequency = previous
            failed = true
        }
    }
}
