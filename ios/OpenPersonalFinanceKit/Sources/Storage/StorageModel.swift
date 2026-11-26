import CoreData
import Foundation

// Builds the Core Data model programmatically so SwiftPM targets share one schema without .xcdatamodeld bundles.
enum StorageModel {
    static let syncLeaseEntity = "SyncLeaseRecord"
    static let tokenEntity = "TokenRecord"
    static let scheduleEntity = "ScheduleRecord"
    static let wakeLogEntity = "WakeLogRecord"

    static func make() -> NSManagedObjectModel {
        let model = NSManagedObjectModel()
        model.entities = [
            makeSyncLeaseEntity(),
            makeTokenEntity(),
            makeScheduleEntity(),
            makeWakeLogEntity(),
        ]
        return model
    }

    private static func makeSyncLeaseEntity() -> NSEntityDescription {
        let entity = NSEntityDescription()
        entity.name = syncLeaseEntity
        entity.properties = [
            attribute("id", .integer64AttributeType, optional: false, defaultValue: Int64(1)),
            attribute("owner", .UUIDAttributeType, optional: false),
            attribute("expiresAt", .dateAttributeType, optional: false),
        ]
        entity.uniquenessConstraints = [["id"]]
        return entity
    }

    private static func makeTokenEntity() -> NSEntityDescription {
        let entity = NSEntityDescription()
        entity.name = tokenEntity
        entity.properties = [
            attribute("accountID", .UUIDAttributeType, optional: false),
            attribute("accountToken", .binaryDataAttributeType, optional: true),
            attribute("balanceToken", .binaryDataAttributeType, optional: true),
            attribute("transactionToken", .binaryDataAttributeType, optional: true),
            attribute("pendingFullResync", .booleanAttributeType, optional: false, defaultValue: false),
            attribute("updatedAt", .dateAttributeType, optional: false),
        ]
        entity.uniquenessConstraints = [["accountID"]]
        return entity
    }

    private static func makeScheduleEntity() -> NSEntityDescription {
        let entity = NSEntityDescription()
        entity.name = scheduleEntity
        entity.properties = [
            attribute("id", .integer64AttributeType, optional: false, defaultValue: Int64(1)),
            attribute("frequency", .stringAttributeType, optional: false),
            attribute("updatedAt", .dateAttributeType, optional: false),
        ]
        entity.uniquenessConstraints = [["id"]]
        return entity
    }

    private static func makeWakeLogEntity() -> NSEntityDescription {
        let entity = NSEntityDescription()
        entity.name = wakeLogEntity
        entity.properties = [
            attribute("id", .UUIDAttributeType, optional: false),
            attribute("sequence", .integer64AttributeType, optional: false, defaultValue: Int64(0)),
            attribute("startedAt", .dateAttributeType, optional: false),
            attribute("durationMilliseconds", .integer64AttributeType, optional: false, defaultValue: Int64(0)),
            attribute("trigger", .stringAttributeType, optional: false),
            attribute("dataTypesJSON", .stringAttributeType, optional: false),
            attribute("changeCount", .integer64AttributeType, optional: true),
            attribute("failure", .stringAttributeType, optional: true),
        ]
        return entity
    }

    private static func attribute(
        _ name: String,
        _ type: NSAttributeType,
        optional: Bool,
        defaultValue: Any? = nil
    ) -> NSAttributeDescription {
        let description = NSAttributeDescription()
        description.name = name
        description.attributeType = type
        description.isOptional = optional
        description.defaultValue = defaultValue
        return description
    }
}
