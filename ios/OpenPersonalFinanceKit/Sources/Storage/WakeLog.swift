import Domain
import Foundation
import SwiftData
import os

// Shared by the app and the extension via SwiftData, eliminating lock files and sleep retries.
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
        let startedAt = entry.startedAt
        let trigger = entry.trigger.rawValue

        try await container.writeAsync(reason: "WakeLog.append") { context in
            var latestDescriptor = FetchDescriptor<StoredWakeLogEntry>(
                sortBy: [SortDescriptor(\.sequence, order: .reverse)]
            )
            latestDescriptor.fetchLimit = 1
            let nextSequence = (try context.fetch(latestDescriptor).first?.sequence ?? 0) + 1

            context.insert(
                StoredWakeLogEntry(
                    sequence: nextSequence,
                    startedAt: startedAt,
                    durationMilliseconds: durationMilliseconds,
                    trigger: trigger,
                    dataTypesJSON: dataTypesJSON,
                    changeCount: changeCount,
                    failure: failure
                )
            )
            try context.save()

            let totalCount = try context.fetchCount(FetchDescriptor<StoredWakeLogEntry>())
            if totalCount > Self.capacity {
                var overflowDescriptor = FetchDescriptor<StoredWakeLogEntry>(
                    sortBy: [SortDescriptor(\.sequence, order: .forward)]
                )
                overflowDescriptor.fetchLimit = totalCount - Self.capacity
                let oldest = try context.fetch(overflowDescriptor)
                oldest.forEach { context.delete($0) }
                try context.save()
            }
        }
    }

    package func entries() async throws -> [WakeLogEntry] {
        let decoded: Result<[WakeLogEntry], any Error> = try await container.read { context in
            let descriptor = FetchDescriptor<StoredWakeLogEntry>(
                sortBy: [SortDescriptor(\.sequence, order: .forward)]
            )
            let records = try context.fetch(descriptor)
            return Result { try records.map(Self.toDomain) }
        }
        switch decoded {
        case .success(let entries):
            return entries
        case .failure(let error):
            Log.logger.warning("Clearing an unreadable wake log: \(String(describing: error), privacy: .public)")
            try await container.writeAsync(reason: "WakeLog.wipeCorrupt") { context in
                try context.delete(model: StoredWakeLogEntry.self)
                try context.save()
            }
            return []
        }
    }

    private static func toDomain(_ record: StoredWakeLogEntry) throws -> WakeLogEntry {
        let outcome: WakeLogEntry.Outcome
        switch (record.changeCount, record.failure) {
        case (let count?, nil):
            outcome = .succeeded(changeCount: Int(count))
        case (nil, let reason?):
            outcome = .failed(try enumValue(reason))
        default:
            throw StorageError.invalidStoredValue("Outcome needs exactly one of changeCount and failure")
        }
        let rawTypes = try JSONDecoder().decode([String].self, from: Data(record.dataTypesJSON.utf8))
        return WakeLogEntry(
            startedAt: record.startedAt,
            duration: .milliseconds(Int(record.durationMilliseconds)),
            trigger: try enumValue(record.trigger),
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
