import Foundation
import Testing

@testable import OpenPersonalFinanceKit

struct ChangeSetTests {
    struct Item: Identifiable, Equatable, Sendable {
        var id: UUID
        var value: Int
    }

    let a = UUID()
    let b = UUID()
    let first = Data([1])
    let second = Data([2])

    @Test func insertThenUpdateStaysAnInsertWithTheLaterValue() {
        let merged = ChangeSet(inserted: [Item(id: a, value: 1)], newToken: first)
            .merging(ChangeSet(updated: [Item(id: a, value: 2)], newToken: second))
        #expect(merged == ChangeSet(inserted: [Item(id: a, value: 2)], newToken: second))
    }

    @Test func insertThenDeleteDisappears() {
        let merged = ChangeSet(inserted: [Item(id: a, value: 1), Item(id: b, value: 1)], newToken: first)
            .merging(ChangeSet(deleted: [a], newToken: second))
        #expect(merged == ChangeSet(inserted: [Item(id: b, value: 1)], newToken: second))
    }

    @Test func updateThenDeleteIsADelete() {
        let merged = ChangeSet(updated: [Item(id: a, value: 1)], newToken: first)
            .merging(ChangeSet(deleted: [a], newToken: second))
        #expect(merged == ChangeSet<Item>(deleted: [a], newToken: second))
    }

    @Test func deleteThenInsertIsAnUpdate() {
        let merged = ChangeSet<Item>(deleted: [a], newToken: first)
            .merging(ChangeSet(inserted: [Item(id: a, value: 3)], newToken: second))
        #expect(merged == ChangeSet(updated: [Item(id: a, value: 3)], newToken: second))
    }

    @Test func insertDeleteInsertAppearsOnce() {
        let merged = ChangeSet(inserted: [Item(id: a, value: 1)], newToken: first)
            .merging(ChangeSet(deleted: [a], newToken: first))
            .merging(ChangeSet(inserted: [Item(id: a, value: 2)], newToken: second))
        #expect(merged == ChangeSet(inserted: [Item(id: a, value: 2)], newToken: second))
    }

    @Test func countsAndEmptiness() {
        let set = ChangeSet(inserted: [Item(id: a, value: 1)], deleted: [b], newToken: first)
        #expect(set.count == 2)
        #expect(!set.isEmpty)
        #expect(ChangeSet<Item>(newToken: first).isEmpty)
    }
}
