import Foundation

public struct ChangeSet<Element: Identifiable & Sendable>: Sendable where Element.ID: Hashable & Sendable {
    public let inserted: [Element]
    public let updated: [Element]
    public let deleted: [Element.ID]
    public let newToken: Data

    package init(
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
        fallbackToken: Data
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
