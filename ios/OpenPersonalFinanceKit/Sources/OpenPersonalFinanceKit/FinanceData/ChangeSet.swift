import Foundation

public struct ChangeSet<Item: Identifiable & Sendable>: Sendable where Item.ID == UUID {
    public var inserted: [Item]
    public var updated: [Item]
    public var deleted: [UUID]
    /// Opaque; pass it back as `since` to read only what changed after this set.
    public var newToken: Data

    public init(inserted: [Item] = [], updated: [Item] = [], deleted: [UUID] = [], newToken: Data) {
        self.inserted = inserted
        self.updated = updated
        self.deleted = deleted
        self.newToken = newToken
    }

    public var isEmpty: Bool { inserted.isEmpty && updated.isEmpty && deleted.isEmpty }

    public var count: Int { inserted.count + updated.count + deleted.count }

    /// Folds a later change set into this one, so the result describes the net change and carries the later token.
    public func merging(_ later: ChangeSet) -> ChangeSet {
        var merge = Merge(self)
        merge.apply(later)
        return merge.result(token: later.newToken)
    }
}

extension ChangeSet: Equatable where Item: Equatable {}
extension ChangeSet: Codable where Item: Codable {}

private struct Merge<Item: Identifiable & Sendable> where Item.ID == UUID {
    enum Entry {
        case inserted(Item)
        case updated(Item)
        case deleted
    }

    var entries: [UUID: Entry] = [:]
    var order: [UUID] = []

    init(_ first: ChangeSet<Item>) {
        apply(first)
    }

    mutating func apply(_ changes: ChangeSet<Item>) {
        for item in changes.inserted {
            switch entries[item.id] {
            case .none, .inserted: record(item.id, .inserted(item))
            // Whoever read the delete may still hold the item, so its return is an update.
            case .deleted, .updated: record(item.id, .updated(item))
            }
        }
        for item in changes.updated {
            if case .inserted = entries[item.id] {
                record(item.id, .inserted(item))
            } else {
                record(item.id, .updated(item))
            }
        }
        for id in changes.deleted {
            if case .inserted = entries[id] {
                entries[id] = nil
            } else {
                record(id, .deleted)
            }
        }
    }

    private mutating func record(_ id: UUID, _ entry: Entry) {
        if entries[id] == nil { order.append(id) }
        entries[id] = entry
    }

    func result(token: Data) -> ChangeSet<Item> {
        var result = ChangeSet<Item>(newToken: token)
        var seen = Set<UUID>()
        for id in order where seen.insert(id).inserted {
            switch entries[id] {
            case .inserted(let item): result.inserted.append(item)
            case .updated(let item): result.updated.append(item)
            case .deleted: result.deleted.append(id)
            case .none: break
            }
        }
        return result
    }
}
