import Domain
import Foundation
import os

package actor ScheduleStore: ScheduleStoring {
    private struct Envelope: VersionedEnvelope {
        static let currentVersion = 1
        let schemaVersion: Int
        let frequency: String
    }

    private let file: VersionedFile<Envelope>

    package init(directory: AppGroupDirectory) {
        file = VersionedFile(url: directory.scheduleFile)
    }

    // An unknown frequency is cleared, so the choice falls back to the default until it is picked again.
    package func frequency() throws -> SyncFrequency? {
        guard let stored = try file.read()?.frequency else { return nil }
        guard let frequency = SyncFrequency(rawValue: stored) else {
            Log.logger.warning("Clearing an unknown sync frequency: \(stored, privacy: .public)")
            try file.remove()
            return nil
        }
        return frequency
    }

    package func save(_ frequency: SyncFrequency) throws {
        try file.write(Envelope(schemaVersion: Envelope.currentVersion, frequency: frequency.rawValue))
    }
}
