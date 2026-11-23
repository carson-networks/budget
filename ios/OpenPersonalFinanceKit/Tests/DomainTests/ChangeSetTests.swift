import Domain
import Foundation
import Testing

struct ChangeSetTests {
    private struct Item: Identifiable, Equatable, Sendable {
        let id: UUID
        let label: String
    }

    @Test func mergingNoChunksKeepsTheFallbackToken() {
        let fallback = Data("existing-token".utf8)
        let merged = ChangeSet<Item>.merging([], fallbackToken: fallback)
        #expect(merged.inserted.isEmpty)
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted.isEmpty)
        #expect(merged.newToken == fallback)
    }

    @Test func mergingNonEmptyListOfEmptyChunksKeepsLastToken() {
        let firstToken = Data("t1".utf8)
        let lastToken = Data("t2".utf8)
        let merged = ChangeSet<Item>.merging(
            [
                ChangeSet(newToken: firstToken),
                ChangeSet(newToken: lastToken),
            ],
            fallbackToken: Data()
        )
        #expect(merged.inserted.isEmpty)
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted.isEmpty)
        #expect(merged.newToken == lastToken)
    }

    @Test func insertThenUpdateSupersedesInsertWithLatestValue() {
        let id = UUID()
        let first = Item(id: id, label: "pending")
        let second = Item(id: id, label: "booked")

        let merged = ChangeSet.merging(
            [
                ChangeSet(inserted: [first], newToken: Data("t1".utf8)),
                ChangeSet(updated: [second], newToken: Data("t2".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted == [second])
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted.isEmpty)
        #expect(merged.newToken == Data("t2".utf8))
    }

    @Test func updateThenUpdateSupersedesEarlierUpdate() {
        let id = UUID()
        let first = Item(id: id, label: "v1")
        let second = Item(id: id, label: "v2")

        let merged = ChangeSet.merging(
            [
                ChangeSet(updated: [first], newToken: Data("t1".utf8)),
                ChangeSet(updated: [second], newToken: Data("t2".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted.isEmpty)
        #expect(merged.updated == [second])
        #expect(merged.deleted.isEmpty)
        #expect(merged.newToken == Data("t2".utf8))
    }

    @Test func insertThenDeleteRemovesInsertAndRecordsDeletion() {
        let id = UUID()
        let item = Item(id: id, label: "temp")

        let merged = ChangeSet.merging(
            [
                ChangeSet(inserted: [item], newToken: Data("t1".utf8)),
                ChangeSet(deleted: [id], newToken: Data("t2".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted.isEmpty)
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted == [id])
        #expect(merged.newToken == Data("t2".utf8))
    }

    @Test func updateThenDeleteRemovesUpdateAndRecordsDeletion() {
        let id = UUID()
        let item = Item(id: id, label: "updated")

        let merged = ChangeSet.merging(
            [
                ChangeSet(updated: [item], newToken: Data("t1".utf8)),
                ChangeSet(deleted: [id], newToken: Data("t2".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted.isEmpty)
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted == [id])
        #expect(merged.newToken == Data("t2".utf8))
    }

    @Test func insertThenUpdateThenDeleteRecordsOnlyDeletion() {
        let id = UUID()

        let merged = ChangeSet.merging(
            [
                ChangeSet(inserted: [Item(id: id, label: "v1")], newToken: Data("t1".utf8)),
                ChangeSet(updated: [Item(id: id, label: "v2")], newToken: Data("t2".utf8)),
                ChangeSet(deleted: [id], newToken: Data("t3".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted.isEmpty)
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted == [id])
        #expect(merged.newToken == Data("t3".utf8))
    }

    @Test func deduplicatesDeletesAndPreservesDeterministicOrderAcrossChunks() {
        let idA = UUID()
        let idB = UUID()
        let idC = UUID()
        let idD = UUID()

        let merged = ChangeSet.merging(
            [
                ChangeSet(
                    inserted: [Item(id: idA, label: "a1"), Item(id: idB, label: "b1")],
                    updated: [Item(id: idC, label: "c1")],
                    deleted: [idD],
                    newToken: Data("t1".utf8)
                ),
                ChangeSet(
                    updated: [Item(id: idA, label: "a2"), Item(id: idC, label: "c2")],
                    deleted: [idD, idB],
                    newToken: Data("t2".utf8)
                ),
                ChangeSet(newToken: Data("t3".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted == [Item(id: idA, label: "a2")])
        #expect(merged.updated == [Item(id: idC, label: "c2")])
        #expect(merged.deleted == [idB, idD])
        #expect(merged.newToken == Data("t3".utf8))
    }

    @Test func deleteThenInsertRestoresItemAsInserted() {
        let id = UUID()
        let restored = Item(id: id, label: "recreated")

        let merged = ChangeSet.merging(
            [
                ChangeSet(deleted: [id], newToken: Data("t1".utf8)),
                ChangeSet(inserted: [restored], newToken: Data("t2".utf8)),
            ],
            fallbackToken: Data()
        )

        #expect(merged.inserted == [restored])
        #expect(merged.updated.isEmpty)
        #expect(merged.deleted.isEmpty)
        #expect(merged.newToken == Data("t2".utf8))
    }
}
