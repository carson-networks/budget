import CoreData
import Domain
import Foundation
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
        guard
            let stored = try container.read({ context in
                let request = Self.fetchRequest()
                return try context.fetch(request).first?.value(forKey: "frequency") as? String
            })
        else {
            return nil
        }
        guard let frequency = SyncFrequency(rawValue: stored) else {
            Log.logger.warning("Clearing an unknown sync frequency: \(stored, privacy: .public)")
            try await container.writeAsync(
                reason: "ScheduleStore.clearUnknown",
                mergePolicy: .mergeByPropertyObjectTrump
            ) { context in
                if let record = try context.fetch(Self.fetchRequest()).first {
                    context.delete(record)
                    try context.save()
                }
            }
            return nil
        }
        return frequency
    }

    package func save(_ frequency: SyncFrequency) async throws {
        let updatedAt = Date()
        try await container.writeAsync(
            reason: "ScheduleStore.save",
            mergePolicy: .mergeByPropertyObjectTrump
        ) { context in
            let record =
                try context.fetch(Self.fetchRequest()).first
                ?? {
                    let created = NSEntityDescription.insertNewObject(
                        forEntityName: StorageModel.scheduleEntity,
                        into: context
                    )
                    created.setValue(Int64(1), forKey: "id")
                    return created
                }()
            record.setValue(frequency.rawValue, forKey: "frequency")
            record.setValue(updatedAt, forKey: "updatedAt")
            try context.save()
        }
    }

    private static func fetchRequest() -> NSFetchRequest<NSManagedObject> {
        let request = NSFetchRequest<NSManagedObject>(entityName: StorageModel.scheduleEntity)
        request.predicate = NSPredicate(format: "id == %lld", Int64(1))
        request.fetchLimit = 1
        request.shouldRefreshRefetchedObjects = true
        return request
    }
}
