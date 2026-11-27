import Domain
import Observation
import os

@Observable
public final class SyncFrequencyModel {
    public private(set) var frequency: SyncFrequency = .off
    public private(set) var isSaving = false
    public private(set) var failed = false
    private let schedule: any SyncScheduling

    public init(schedule: any SyncScheduling) {
        self.schedule = schedule
    }

    // Called at launch: applies the saved choice again, then shows it.
    public func applySavedFrequency() async {
        do {
            try await schedule.reapply()
            frequency = try await schedule.frequency()
            failed = false
        } catch {
            Log.logger.error("Applying the saved frequency failed: \(String(describing: error), privacy: .public)")
            failed = true
        }
    }

    // Shows the choice at once and puts the old one back if it can't be applied and saved.
    public func select(_ newValue: SyncFrequency) async {
        // A second pick while saving could finish first and leave the screen out of step with what was saved.
        guard !isSaving, newValue != frequency else { return }
        isSaving = true
        defer { isSaving = false }
        let previous = frequency
        frequency = newValue
        do {
            try await schedule.setFrequency(newValue)
            failed = false
        } catch {
            Log.logger.error("Setting the frequency failed: \(String(describing: error), privacy: .public)")
            frequency = previous
            failed = true
        }
    }
}
