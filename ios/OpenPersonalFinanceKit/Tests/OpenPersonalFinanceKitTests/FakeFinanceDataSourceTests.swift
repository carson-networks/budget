import Foundation
import Testing

@testable import OpenPersonalFinanceKit

struct FakeFinanceDataSourceTests {
    let card = UUID("0A000000-0000-4000-8000-000000000001")
    let savings = UUID("0A000000-0000-4000-8000-000000000002")
    let coffee = UUID("0C000000-0000-4000-8000-000000000001")
    let gadget = UUID("0C000000-0000-4000-8000-000000000003")
    let parking = UUID("0C000000-0000-4000-8000-000000000004")

    func makeSource(authorization: WalletAuthorization = .authorized) throws -> FakeFinanceDataSource {
        FakeFinanceDataSource(fixture: try FinanceFixture.sample(), authorization: authorization)
    }

    @Test func firstReadReturnsStepZero() async throws {
        let source = try makeSource()
        let accounts = try await source.accountChanges(since: nil)
        #expect(accounts.inserted.map(\.id) == [card, savings])

        let transactions = try await source.transactionChanges(accountID: card, since: nil)
        #expect(transactions.inserted.count == 5)
        #expect(transactions.inserted.first { $0.id == coffee }?.status == .pending)
    }

    @Test func readingAgainFromTheTokenReturnsNothingUntilAdvanced() async throws {
        let source = try makeSource()
        let first = try await source.transactionChanges(accountID: card, since: nil)
        let again = try await source.transactionChanges(accountID: card, since: first.newToken)
        #expect(again.isEmpty)
        #expect(again.newToken == first.newToken)
    }

    @Test func pendingBooksRejectedAndDeletedArriveAfterAdvancing() async throws {
        let source = try makeSource()
        let first = try await source.transactionChanges(accountID: card, since: nil)
        await source.advance()
        let second = try await source.transactionChanges(accountID: card, since: first.newToken)

        #expect(second.inserted.isEmpty)
        #expect(second.updated.map(\.id) == [coffee, gadget])
        #expect(second.updated.map(\.status) == [.booked, .rejected])
        #expect(second.deleted == [parking])
        #expect(second.newToken != first.newToken)
    }

    @Test func readingFromNilAfterAdvancingMergesEveryStep() async throws {
        let source = try makeSource()
        await source.advance()
        let all = try await source.transactionChanges(accountID: card, since: nil)

        #expect(all.inserted.count == 4)
        #expect(all.inserted.first { $0.id == coffee }?.status == .booked)
        #expect(all.updated.isEmpty)
        #expect(all.deleted.isEmpty)
    }

    @Test func advancingPastTheLastStepChangesNothing() async throws {
        let source = try makeSource()
        let first = try await source.accountChanges(since: nil)
        await source.advance()
        await source.advance()
        let later = try await source.accountChanges(since: first.newToken)
        #expect(later.isEmpty)
    }

    @Test func balancesProgressPerAccount() async throws {
        let source = try makeSource()
        let cardFirst = try await source.balanceChanges(accountID: card, since: nil)
        let savingsFirst = try await source.balanceChanges(accountID: savings, since: nil)
        await source.advance()
        let cardSecond = try await source.balanceChanges(accountID: card, since: cardFirst.newToken)
        let savingsSecond = try await source.balanceChanges(accountID: savings, since: savingsFirst.newToken)

        #expect(cardSecond.inserted.map(\.booked?.amount) == [Decimal("408")])
        #expect(savingsSecond.isEmpty)
    }

    @Test func unknownAccountHasNoChanges() async throws {
        let source = try makeSource()
        #expect(try await source.transactionChanges(accountID: UUID(), since: nil).isEmpty)
    }

    @Test func aTokenFromAnotherStreamIsInvalid() async throws {
        let source = try makeSource()
        let cardToken = try await source.transactionChanges(accountID: card, since: nil).newToken
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.transactionChanges(accountID: savings, since: cardToken)
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.balanceChanges(accountID: card, since: cardToken)
        }
    }

    @Test func garbageTokenIsInvalid() async throws {
        let source = try makeSource()
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.accountChanges(since: Data("nope".utf8))
        }
    }

    @Test func readsNeedAuthorization() async throws {
        let source = try makeSource(authorization: .notDetermined)
        #expect(try await source.authorizationStatus() == .notDetermined)
        await #expect(throws: FinanceDataError.notAuthorized) {
            try await source.accountChanges(since: nil)
        }

        #expect(try await source.requestAuthorization() == .authorized)
        #expect(try await source.accountChanges(since: nil).inserted.count == 2)
    }

    @Test func aDeniedRequestStaysDenied() async throws {
        let source = FakeFinanceDataSource(
            fixture: try FinanceFixture.sample(), authorization: .notDetermined, authorizationOnRequest: .denied)
        #expect(try await source.requestAuthorization() == .denied)
        #expect(try await source.requestAuthorization() == .denied)
    }

    @Test func lockedDeviceIsDataUnavailable() async throws {
        let source = try makeSource()
        await source.setDataAvailable(false)
        await #expect(throws: FinanceDataError.dataUnavailable) {
            try await source.accountChanges(since: nil)
        }
    }
}
