import Domain
import Fakes
import Foundation
import Sync
import Testing

struct WalletHistoryReaderTests {
    private static let card = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()
    private static let savings = UUID(uuidString: "12222222-2222-4222-8222-222222222222") ?? UUID()

    private let tokens = InMemoryTokenStore()
    private let reader: WalletHistoryReader

    init() {
        reader = WalletHistoryReader(source: FakeFinanceDataSource.sample(), tokens: tokens)
    }

    @Test func readEverythingReturnsTheFirstStepAndSavesStartingTokens() async throws {
        let read = try await reader.readEverything()
        #expect(read.accounts.inserted.map(\.id) == [Self.card, Self.savings])
        #expect(read.histories.map(\.accountID) == [Self.card, Self.savings])
        let card = try #require(read.histories.first)
        #expect(!card.fromSavedToken)
        #expect(card.account.inserted.map(\.id) == [Self.card])
        #expect(card.transactions.inserted.count == 5)
        #expect(await tokens.tokens(for: Self.card).transactionToken != nil)
    }

    @Test func readEverythingKeepsTokensAlreadySaved() async throws {
        _ = try await reader.readEverything()
        _ = try await reader.readSinceSavedTokens(accountID: Self.card)
        let advanced = await tokens.tokens(for: Self.card)

        _ = try await reader.readEverything()
        #expect(await tokens.tokens(for: Self.card) == advanced)
    }

    @Test func readSinceSavedTokensReturnsOnlyChangesAndAdvances() async throws {
        _ = try await reader.readEverything()

        let first = try await reader.readSinceSavedTokens(accountID: Self.card)
        #expect(first.fromSavedToken)
        #expect(first.account.inserted.isEmpty)
        #expect(first.balances.updated.count == 1)
        #expect(first.transactions.inserted.count == 1)
        #expect(first.transactions.updated.map(\.status) == [.booked, .rejected])
        #expect(first.transactions.deleted.count == 1)

        let second = try await reader.readSinceSavedTokens(accountID: Self.card)
        #expect(second.transactions.inserted.isEmpty && second.transactions.updated.isEmpty)
    }

    @Test func readSinceSavedTokensWithoutTokensStartsFromTheBeginning() async throws {
        let read = try await reader.readSinceSavedTokens(accountID: Self.savings)
        #expect(!read.fromSavedToken)
        #expect(read.account.inserted.map(\.id) == [Self.savings])
        #expect(read.transactions.inserted.count == 1)
    }

    @Test func aRejectedTokenThrowsAndIsKept() async throws {
        let bad = AccountTokens(transactionToken: Data("corrupt".utf8))
        await tokens.save(bad, for: Self.card)

        await #expect(throws: FinanceDataError.invalidToken) {
            try await reader.readSinceSavedTokens(accountID: Self.card)
        }
        #expect(await tokens.tokens(for: Self.card) == bad)
    }

    @Test func resetTokensClearsEveryAccount() async throws {
        _ = try await reader.readEverything()
        try await reader.resetTokens()
        #expect(await tokens.tokens(for: Self.card) == .empty)
        #expect(await tokens.tokens(for: Self.savings) == .empty)
    }
}
