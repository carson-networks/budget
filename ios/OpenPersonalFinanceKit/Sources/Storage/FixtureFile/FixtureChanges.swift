import Domain
import Foundation

// Empty lists are left out of the file, so each is optional here.
struct FixtureChanges<Item: Codable>: Codable {
    var inserted: [Item]?
    var updated: [Item]?
    var deleted: [UUID]?

    func toDomain<Element>(_ element: (Item) throws -> Element) throws -> WalletChanges<Element> {
        WalletChanges(
            inserted: try (inserted ?? []).map(element),
            updated: try (updated ?? []).map(element),
            deleted: deleted ?? []
        )
    }
}
