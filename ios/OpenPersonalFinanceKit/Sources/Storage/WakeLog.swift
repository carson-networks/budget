import CoreData
import Domain
import Foundation
import os

// Shared by the app and the extension through Core Data's SQLite store, eliminating lock files and sleep retries.
package actor WakeLog: LogStoring {
    package static let capacity = 500

    private let container: StorageContainer

    package init(container: StorageContainer) {
        self.container = container
    }

    package init(directory: AppGroupDirectory) {
        self.init(container: StorageContainer(directory: directory))
    }

    package func append(_ entry: WakeLogEntry) async throws {
        let durationMilliseconds = Int64((entry.duration / .milliseconds(1)).rounded())
        let dataTypesData = try JSONEncoder().encode(entry.dataTypes.map(\.rawValue))
        guard let dataTypesJSON = String(data: dataTypesData, encoding: .utf8) else {
            throw StorageError.invalidStoredValue("Failed to encode data types as UTF-8")
        }
        let (changeCount, failure): (Int64?, String?) =
            switch entry.outcome {
            case .succeeded(let count): (Int64(count), nil)
            case .failed(let reason): (nil, reason.rawValue)
            }

        try await container.writeAsync(reason: "WakeLog.append", mergePolicy: .mergeByPropertyObjectTrump) { context in
            let latestRequest = NSFetchRequest<NSManagedObject>(entityName: StorageModel.wakeLogEntity)
            latestRequest.sortDescriptors = [NSSortDescriptor(key: "sequence", ascending: false)]
            latestRequest.fetchLimit = 1
            let nextSequence = (try context.fetch(latestRequest).first?.value(forKey: "sequence") as? Int64 ?? 0) + 1

            let record = NSEntityDescription.insertNewObject(forEntityName: StorageModel.wakeLogEntity, into: context)
            record.setValue(UUID(), forKey: "id")
            record.setValue(nextSequence, forKey: "sequence")
            record.setValue(entry.startedAt, forKey: "startedAt")
            record.setValue(durationMilliseconds, forKey: "durationMilliseconds")
            record.setValue(entry.trigger.rawValue, forKey: "trigger")
            record.setValue(dataTypesJSON, forKey: "dataTypesJSON")
            record.setValue(changeCount.map(NSNumber.init(value:)), forKey: "changeCount")
            record.setValue(failure, forKey: "failure")

            let countRequest = NSFetchRequest<NSManagedObject>(entityName: StorageModel.wakeLogEntity)
            let totalCount = try context.count(for: countRequest)
            if totalCount > Self.capacity {
                let overflowRequest = NSFetchRequest<NSManagedObject>(entityName: StorageModel.wakeLogEntity)
                overflowRequest.sortDescriptors = [NSSortDescriptor(key: "sequence", ascending: true)]
                overflowRequest.fetchLimit = totalCount - Self.capacity
                let oldest = try context.fetch(overflowRequest)
                oldest.forEach { context.delete($0) }
            }
            try context.save()
        }
    }

    package func entries() async throws -> [WakeLogEntry] {
        let decoded: Result<[WakeLogEntry], any Error> = try container.read { context in
            let request = NSFetchRequest<NSManagedObject>(entityName: StorageModel.wakeLogEntity)
            request.sortDescriptors = [NSSortDescriptor(key: "sequence", ascending: true)]
            request.shouldRefreshRefetchedObjects = true
            let records = try context.fetch(request)
            return Result { try records.map(Self.toDomain) }
        }
        switch decoded {
        case .success(let entries):
            return entries
        case .failure(let error):
            Log.logger.warning("Clearing an unreadable wake log: \(String(describing: error), privacy: .public)")
            try await container.writeAsync(reason: "WakeLog.wipeCorrupt", mergePolicy: .mergeByPropertyObjectTrump) {
                context in
                let request = NSFetchRequest<NSManagedObject>(entityName: StorageModel.wakeLogEntity)
                let records = try context.fetch(request)
                records.forEach { context.delete($0) }
                if context.hasChanges {
                    try context.save()
                }
            }
            return []
        }
    }

    private static func toDomain(_ record: NSManagedObject) throws -> WakeLogEntry {
        guard let startedAt = record.value(forKey: "startedAt") as? Date,
            let durationMilliseconds = record.value(forKey: "durationMilliseconds") as? Int64,
            let triggerRaw = record.value(forKey: "trigger") as? String,
            let dataTypesJSON = record.value(forKey: "dataTypesJSON") as? String
        else {
            throw StorageError.invalidStoredValue("Missing wake log columns")
        }
        let changeCount = (record.value(forKey: "changeCount") as? NSNumber)?.intValue
        let failureRaw = record.value(forKey: "failure") as? String
        let outcome: WakeLogEntry.Outcome
        switch (changeCount, failureRaw) {
        case (let count?, nil):
            outcome = .succeeded(changeCount: count)
        case (nil, let reason?):
            outcome = .failed(try enumValue(reason))
        default:
            throw StorageError.invalidStoredValue("Outcome needs exactly one of changeCount and failure")
        }
        let rawTypes = try JSONDecoder().decode([String].self, from: Data(dataTypesJSON.utf8))
        return WakeLogEntry(
            startedAt: startedAt,
            duration: .milliseconds(Int(durationMilliseconds)),
            trigger: try enumValue(triggerRaw),
            dataTypes: try rawTypes.map { try enumValue($0) },
            outcome: outcome
        )
    }

    private static func enumValue<Value: RawRepresentable<String>>(_ raw: String) throws -> Value {
        guard let value = Value(rawValue: raw) else {
            throw StorageError.invalidStoredValue("Unknown \(Value.self): \(raw)")
        }
        return value
    }
}
