import Domain
import Foundation
import SwiftData
import os

package actor ScheduleStore: ScheduleStoring {
    private let container: StorageContainer

    package init(container: StorageContainer) {
        self.container = container
    }

    package init(directory: AppGroupDirectory) {
        self.init(container: StorageContainer(directory: directory))
    }

    // An unknown frequency is cleared, so the choice falls back to the default until it is picked again.
    package func frequency() async throws -> SyncFrequency? {
        let key = 1
        guard
            let stored = try await container.read({ context in
                var descriptor = FetchDescriptor<StoredSchedule>(predicate: #Predicate { $0.key == key })
                descriptor.fetchLimit = 1
                return try context.fetch(descriptor).first?.frequency
            })
        else {
            return nil
        }
        guard let frequency = SyncFrequency(rawValue: stored) else {
            Log.logger.warning("Clearing an unknown sync frequency: \(stored, privacy: .public)")
            try await container.writeAsync(reason: "ScheduleStore.clearUnknown") { context in
                try context.delete(model: StoredSchedule.self)
                try context.save()
            }
            return nil
        }
        return frequency
    }

    package func save(_ frequency: SyncFrequency) async throws {
        let key = 1
        let updatedAt = Date()
        let rawValue = frequency.rawValue
        try await container.writeAsync(reason: "ScheduleStore.save") { context in
            var descriptor = FetchDescriptor<StoredSchedule>(predicate: #Predicate { $0.key == key })
            descriptor.fetchLimit = 1
            if let existing = try context.fetch(descriptor).first {
                existing.frequency = rawValue
                existing.updatedAt = updatedAt
            } else {
                context.insert(StoredSchedule(frequency: rawValue, updatedAt: updatedAt))
            }
            try context.save()
        }
    }
}
