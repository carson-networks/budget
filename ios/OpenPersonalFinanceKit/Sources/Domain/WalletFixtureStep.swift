import Foundation

// One read of one stream: what a single history token moved past.
package struct WalletFixtureStep<Element: Identifiable & Codable & Sendable>: Codable, Sendable
where Element.ID == UUID {
    package let inserted: [Element]
    package let updated: [Element]
    package let deleted: [UUID]

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

    package func map(_ transform: (Element) -> Element) -> WalletFixtureStep<Element> {
        WalletFixtureStep(inserted: inserted.map(transform), updated: updated.map(transform), deleted: deleted)
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case inserted
        case updated
        case deleted
    }

    package init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        inserted = try container.decodeIfPresent([Element].self, forKey: .inserted) ?? []
        updated = try container.decodeIfPresent([Element].self, forKey: .updated) ?? []
        deleted = try container.decodeIfPresent([UUID].self, forKey: .deleted) ?? []
    }

    package func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if !inserted.isEmpty { try container.encode(inserted, forKey: .inserted) }
        if !updated.isEmpty { try container.encode(updated, forKey: .updated) }
        if !deleted.isEmpty { try container.encode(deleted, forKey: .deleted) }
    }
}
