import Foundation

// Empty lists are left out of the file, so each is optional here.
struct FixtureChanges<Item: Codable>: Codable {
    var inserted: [Item]?
    var updated: [Item]?
    var deleted: [UUID]?

    init<Element>(_ changes: WalletChanges<Element>, item: (Element) -> Item) {
        inserted = changes.inserted.isEmpty ? nil : changes.inserted.map(item)
        updated = changes.updated.isEmpty ? nil : changes.updated.map(item)
        deleted = changes.deleted.isEmpty ? nil : changes.deleted
    }

    func toDomain<Element>(_ element: (Item) throws -> Element) throws -> WalletChanges<Element> {
        WalletChanges(
            inserted: try (inserted ?? []).map(element),
            updated: try (updated ?? []).map(element),
            deleted: deleted ?? []
        )
    }
}
