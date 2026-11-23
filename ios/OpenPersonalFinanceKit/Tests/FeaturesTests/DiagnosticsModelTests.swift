import Domain
import Fakes
import Features
import Foundation
import Testing

struct DiagnosticsModelTests {
    @Test func summarisesEachAccountFromTheSample() async throws {
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample())
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
        let model = DiagnosticsModel(source: FakeFinanceDataSource.sample(authorizationStatus: .denied))
        await model.load()
        #expect(model.authorization == .denied)
        #expect(model.failure == .notAuthorized)
        #expect(model.accounts.isEmpty)
    }

    @Test func reportsLockedData() async {
        let source = FakeFinanceDataSource.sample()
        await source.setInjectedError(.dataUnavailable)
        let model = DiagnosticsModel(source: source)
        await model.load()
        #expect(model.failure == .dataUnavailable)
    }

    @Test func clearsFailureAfterASuccessfulRetry() async {
        let source = FakeFinanceDataSource.sample()
        let model = DiagnosticsModel(source: source)

        await source.setInjectedError(.invalidToken)
        await model.load()
        #expect(model.failure == .other)

        await source.setInjectedError(nil)
        await model.load()
        #expect(model.failure == nil)
        #expect(model.accounts.count == 2)
    }
}
