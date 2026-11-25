import Domain
import Foundation

// Empty lists are left out of the file.
nonisolated struct ExportChanges<Item: Encodable>: Encodable {
    var inserted: [Item]?
    var updated: [Item]?
    var deleted: [UUID]?

    init<Element>(_ changes: WalletChanges<Element>, item: (Element) -> Item) {
        inserted = changes.inserted.isEmpty ? nil : changes.inserted.map(item)
        updated = changes.updated.isEmpty ? nil : changes.updated.map(item)
        deleted = changes.deleted.isEmpty ? nil : changes.deleted
    }
}
