import Domain
import Fakes
import Features
import Foundation
import Testing

struct DiagnosticsModelTests {
    @Test func summarisesEachAccountFromTheSample() async throws {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        await model.load()

        #expect(model.failure == nil)
        #expect(model.authorization == .authorized)
        #expect(model.accounts.map(\.account.displayName) == ["Apple Card", "Savings"])

        let card = try #require(model.accounts.first)
        #expect(card.balance?.booked?.amount == Decimal(string: "59.25"))
        #expect(card.transactions.count == 5)
        #expect(card.transactions.map(\.transactionDate) == card.transactions.map(\.transactionDate).sorted(by: >))
        #expect(card.statusCounts.map(\.status) == [.authorized, .pending, .booked])
        #expect(card.statusCounts.map(\.count) == [1, 2, 2])

        let range = try #require(card.dateRange)
        #expect(range.lowerBound == card.transactions.last?.transactionDate)
        #expect(range.upperBound == card.transactions.first?.transactionDate)
    }

    @Test func reportsMissingAccess() async {
        let model = DiagnosticsModel(
            source: FakeFinanceDataSource.sample(authorizationStatus: .denied),
            history: FakeWalletHistoryReader.sample()
        )
        await model.load()
        #expect(model.authorization == .denied)
        #expect(model.failure == .notAuthorized)
        #expect(model.accounts.isEmpty)
    }

    @Test func reportsLockedData() async {
        let source = FakeFinanceDataSource.sample()
        await source.setInjectedError(.dataUnavailable)
        let model = DiagnosticsModel(source: source, history: FakeWalletHistoryReader.sample())
        await model.load()
        #expect(model.failure == .dataUnavailable)
    }

    @Test func clearsFailureAfterASuccessfulRetry() async {
        let source = FakeFinanceDataSource.sample()
        let model = DiagnosticsModel(source: source, history: FakeWalletHistoryReader.sample())

        await source.setInjectedError(.invalidToken)
        await model.load()
        #expect(model.failure == .invalidToken)

        await source.setInjectedError(nil)
        await model.load()
        #expect(model.failure == nil)
        #expect(model.accounts.count == 2)
    }

    @Test func readsOnlyWhatChangedSinceTheFirstRead() async throws {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        await model.load()

        await model.readAgainFromSavedTokens()
        #expect(model.tokenReads.map(\.fromSavedToken) == [true, true])
        let card = try #require(model.tokenReads.first)
        #expect(counts(card.accounts) == [0, 0, 0])
        #expect(counts(card.balances) == [0, 1, 0])
        #expect(counts(card.transactions) == [1, 2, 1])
        #expect(model.tokenReads.last.map { counts($0.transactions) } == [0, 0, 0])

        await model.readAgainFromSavedTokens()
        #expect(
            model.tokenReads.allSatisfy { counts($0.transactions) == [0, 0, 0] && counts($0.balances) == [0, 0, 0] })
    }

    @Test func resetTokensReadsFromTheStartAgain() async throws {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        await model.load()
        await model.readAgainFromSavedTokens()

        await model.resetTokens()
        #expect(model.tokenReads.isEmpty)

        await model.readAgainFromSavedTokens()
        #expect(model.tokenReads.first?.fromSavedToken == false)
        #expect(model.tokenReads.first.map { counts($0.transactions) } == [5, 0, 0])
    }

    @Test func reportsARejectedSavedToken() async throws {
        let history = FakeWalletHistoryReader.sample()
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: history)
        await model.load()
        await history.setInjectedError(.invalidToken)

        await model.readAgainFromSavedTokens()
        #expect(model.failure == .invalidToken)
        #expect(model.tokenReads.isEmpty)
    }

    @Test func keepsTokenReadsWhenTheScreenReappears() async {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        await model.loadIfNeeded()
        await model.readAgainFromSavedTokens()

        await model.loadIfNeeded()
        #expect(model.tokenReads.count == 2)

        await model.load()
        #expect(model.tokenReads.isEmpty)
    }

    @Test(arguments: [false, true])
    func exportedFixtureLoadsBackIntoTheFake(redacted: Bool) async throws {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        await model.load()
        await model.readAgainFromSavedTokens()

        let fixture = try WalletFixture.decode(from: model.fixtureExport(redacted: redacted).data())
        let reloaded = DiagnosticsModel(
            source: FakeFinanceDataSource(fixture: fixture),
            history: FakeWalletHistoryReader(fixture: fixture)
        )
        await reloaded.load()
        #expect(reloaded.failure == nil)
        #expect(reloaded.accounts.map(\.account.displayName) == ["Apple Card", "Savings"])
        #expect(reloaded.accounts.map(\.transactions.count) == [5, 1])

        await reloaded.readAgainFromSavedTokens()
        #expect(reloaded.tokenReads.first.map { counts($0.transactions) } == [1, 2, 1])

        let descriptions = reloaded.accounts.flatMap(\.transactions).map(\.transactionDescription)
        #expect(descriptions.contains("Trader Joe's") == !redacted)
    }

    @Test func exportNeedsSomethingRead() async {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        #expect(!model.canExport)
        await model.load()
        #expect(model.canExport)
    }

    @Test func overlappingReadsRecordOneStep() async throws {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(), history: FakeWalletHistoryReader.sample())
        await model.load()

        async let first: Void = model.readAgainFromSavedTokens()
        async let second: Void = model.readAgainFromSavedTokens()
        _ = await (first, second)
        #expect(!model.isReadingTokens)

        let fixture = try WalletFixture.decode(from: model.fixtureExport(redacted: false).data())
        let card = try #require(fixture.accountHistories.first)
        #expect(card.transactions.count == 2)
    }

    private func counts(_ count: DiagnosticsModel.ChangeCount) -> [Int] {
        [count.inserted, count.updated, count.deleted]
    }
}
