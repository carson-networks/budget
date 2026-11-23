import Foundation

public struct ChangeSet<Element: Identifiable & Sendable>: Sendable where Element.ID: Hashable & Sendable {
    public let inserted: [Element]
    public let updated: [Element]
    public let deleted: [Element.ID]
    public let newToken: Data

    public var isEmpty: Bool {
        inserted.isEmpty && updated.isEmpty && deleted.isEmpty
    }

    public init(
        inserted: [Element] = [],
        updated: [Element] = [],
        deleted: [Element.ID] = [],
        newToken: Data
    ) {
        self.inserted = inserted
        self.updated = updated
        self.deleted = deleted
        self.newToken = newToken
    }

    private enum MergeEntry {
        case inserted(Element)
        case updated(Element)
        case deleted
    }

    package static func merging(
        _ chunks: [ChangeSet<Element>],
        fallbackToken: Data = Data()
    ) -> ChangeSet<Element> {
        var states: [Element.ID: MergeEntry] = [:]
        var order: [Element.ID] = []

        for chunk in chunks {
            for item in chunk.inserted {
                if states[item.id] == nil {
                    order.append(item.id)
                }
                states[item.id] = .inserted(item)
            }
            for item in chunk.updated {
                switch states[item.id] {
                case .inserted:
                    states[item.id] = .inserted(item)
                case .updated, .deleted:
                    states[item.id] = .updated(item)
                case nil:
                    order.append(item.id)
                    states[item.id] = .updated(item)
                }
            }
            for id in chunk.deleted {
                if states[id] == nil {
                    order.append(id)
                }
                states[id] = .deleted
            }
        }

        var inserted: [Element] = []
        var updated: [Element] = []
        var deleted: [Element.ID] = []

        for id in order {
            switch states[id] {
            case .inserted(let item):
                inserted.append(item)
            case .updated(let item):
                updated.append(item)
            case .deleted:
                deleted.append(id)
            case nil:
                break
            }
        }

        return ChangeSet(
            inserted: inserted,
            updated: updated,
            deleted: deleted,
            newToken: chunks.last?.newToken ?? fallbackToken
        )
    }
}

extension ChangeSet: Equatable where Element: Equatable {}

extension ChangeSet: Hashable where Element: Hashable {}

extension ChangeSet: Codable where Element: Codable, Element.ID: Codable {
    private enum CodingKeys: String, CodingKey, CaseIterable {
        case inserted
        case updated
        case deleted
        case newToken
    }

    public init(from decoder: any Decoder) throws {
        try decoder.rejectUnknownKeys(allowed: CodingKeys.self)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        inserted = try container.decode([Element].self, forKey: .inserted)
        updated = try container.decode([Element].self, forKey: .updated)
        deleted = try container.decode([Element.ID].self, forKey: .deleted)
        newToken = try container.decode(Data.self, forKey: .newToken)
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(inserted, forKey: .inserted)
        try container.encode(updated, forKey: .updated)
        try container.encode(deleted, forKey: .deleted)
        try container.encode(newToken, forKey: .newToken)
    }
}
