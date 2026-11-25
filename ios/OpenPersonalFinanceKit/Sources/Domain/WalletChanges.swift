import Foundation

// What one history read moved past, without its token: a fixture step, or a read shown on screen.
public struct WalletChanges<Element: Identifiable & Sendable>: Sendable where Element.ID == UUID {
    public let inserted: [Element]
    public let updated: [Element]
    public let deleted: [UUID]

    package init(inserted: [Element] = [], updated: [Element] = [], deleted: [UUID] = []) {
        self.inserted = inserted
        self.updated = updated
        self.deleted = deleted
    }

    package init(_ changes: ChangeSet<Element>) {
        self.init(inserted: changes.inserted, updated: changes.updated, deleted: changes.deleted)
    }

    package func changeSet(newToken: Data) -> ChangeSet<Element> {
        ChangeSet(inserted: inserted, updated: updated, deleted: deleted, newToken: newToken)
    }

    package func map(_ transform: (Element) -> Element) -> WalletChanges<Element> {
        WalletChanges(inserted: inserted.map(transform), updated: updated.map(transform), deleted: deleted)
    }

    package func filtered(to id: UUID) -> WalletChanges<Element> {
        WalletChanges(
            inserted: inserted.filter { $0.id == id },
            updated: updated.filter { $0.id == id },
            deleted: deleted.filter { $0 == id }
        )
    }
}
