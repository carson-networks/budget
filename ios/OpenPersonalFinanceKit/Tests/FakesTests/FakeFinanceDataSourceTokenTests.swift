import Domain
import Fakes
import Foundation
import Testing

struct FakeFinanceDataSourceTokenTests {
    private static let card = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()
    private static let savings = UUID(uuidString: "12222222-2222-4222-8222-222222222222") ?? UUID()

    @Test func servesOneStepPerToken() async throws {
        let source = FakeFinanceDataSource.sample()

        let first = try await source.transactionChanges(accountID: Self.card, since: nil)
        #expect(first.inserted.count == 5)
        #expect(first.updated.isEmpty)

        let second = try await source.transactionChanges(accountID: Self.card, since: first.newToken)
        #expect(second.inserted.count == 1)
        #expect(second.updated.map(\.status) == [.booked, .rejected])
        #expect(second.deleted.count == 1)

        let third = try await source.transactionChanges(accountID: Self.card, since: second.newToken)
        #expect(third.inserted.isEmpty && third.updated.isEmpty && third.deleted.isEmpty)
        #expect(third.newToken == second.newToken)
    }

    @Test func replaysFromASavedToken() async throws {
        let source = FakeFinanceDataSource.sample()
        let first = try await source.balanceChanges(accountID: Self.card, since: nil)

        let again = try await source.balanceChanges(accountID: Self.card, since: first.newToken)
        let replayed = try await source.balanceChanges(accountID: Self.card, since: first.newToken)
        #expect(again.updated.map(\.id) == replayed.updated.map(\.id))
        #expect(again.newToken == replayed.newToken)
    }

    @Test func treatsAnEmptyTokenAsTheStart() async throws {
        let source = FakeFinanceDataSource.sample()
        let changes = try await source.accountChanges(since: Data())
        #expect(changes.inserted.count == 2)
    }

    @Test func rejectsACorruptToken() async {
        let source = FakeFinanceDataSource.sample()
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.accountChanges(since: Data("not-a-token".utf8))
        }
    }

    @Test func rejectsATokenFromAnotherStream() async throws {
        let source = FakeFinanceDataSource.sample()
        let balances = try await source.balanceChanges(accountID: Self.card, since: nil)
        let transactions = try await source.transactionChanges(accountID: Self.card, since: nil)

        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.transactionChanges(accountID: Self.card, since: balances.newToken)
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.transactionChanges(accountID: Self.savings, since: transactions.newToken)
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.accountChanges(since: transactions.newToken)
        }
    }

    @Test func returnsNothingForAnAccountWithoutHistory() async throws {
        let source = FakeFinanceDataSource.sample()
        let changes = try await source.transactionChanges(accountID: UUID(), since: nil)
        #expect(changes.inserted.isEmpty)
    }
}
