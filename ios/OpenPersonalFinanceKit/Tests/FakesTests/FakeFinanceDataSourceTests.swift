import Domain
import Fakes
import Foundation
import Testing

struct FakeFinanceDataSourceTests {
    @Test func loadsSampleFixtureWithCardSavingsAndTransactionLifecycles() async throws {
        let fixture = try FakeFinanceDataSource.loadFixture()
        let source = FakeFinanceDataSource(fixture: fixture)

        #expect(source.isDataAvailable())
        #expect(try await source.authorizationStatus() == .authorized)

        let accountsStep0 = try await source.accountChanges(since: nil)
        #expect(accountsStep0.inserted.count == 2)
        #expect(accountsStep0.updated.isEmpty)
        #expect(accountsStep0.deleted.isEmpty)

        let card = try #require(accountsStep0.inserted.first { $0.kind == .liability })
        let savings = try #require(accountsStep0.inserted.first { $0.kind == .asset })
        #expect(card.displayName == "Apple Card")
        #expect(card.currencyCode == "USD")
        #expect(card.creditLimit == Decimal(string: "10000.00"))
        #expect(savings.displayName == "Savings")
        #expect(savings.currencyCode == "USD")
        #expect(savings.creditLimit == nil)

        // Second account read at end of stream yields no changes and keeps the same token.
        let accountsStep1 = try await source.accountChanges(since: accountsStep0.newToken)
        #expect(accountsStep1.isEmpty)
        #expect(accountsStep1.newToken == accountsStep0.newToken)

        // Card balances progress from initial insert to update, then stabilize empty.
        let cardBalance0 = try await source.balanceChanges(accountID: card.id, since: nil)
        #expect(cardBalance0.inserted.count == 1)
        #expect(cardBalance0.inserted[0].booked?.amount == Decimal(string: "59.25"))

        let cardBalance1 = try await source.balanceChanges(accountID: card.id, since: cardBalance0.newToken)
        #expect(cardBalance1.inserted.isEmpty)
        #expect(cardBalance1.updated.count == 1)
        #expect(cardBalance1.updated[0].booked?.amount == Decimal(string: "118.75"))

        let cardBalance2 = try await source.balanceChanges(accountID: card.id, since: cardBalance1.newToken)
        #expect(cardBalance2.isEmpty)
        #expect(cardBalance2.newToken == cardBalance1.newToken)

        // Card transactions show pending -> booked, authorized -> rejected, and deleted.
        let cardTx0 = try await source.transactionChanges(accountID: card.id, since: nil)
        #expect(cardTx0.inserted.count == 5)
        #expect(cardTx0.updated.isEmpty)
        #expect(cardTx0.deleted.isEmpty)

        let pendingCharge = try #require(
            cardTx0.inserted.first { $0.status == .pending && $0.merchantName == "Blue Bottle Coffee" }
        )
        let authorizedCharge = try #require(cardTx0.inserted.first { $0.status == .authorized })
        let tempCharge = try #require(
            cardTx0.inserted.first { $0.status == .pending && $0.merchantName == nil }
        )

        let cardTx1 = try await source.transactionChanges(accountID: card.id, since: cardTx0.newToken)
        #expect(cardTx1.inserted.count == 1)
        #expect(cardTx1.updated.count == 2)
        #expect(cardTx1.deleted == [tempCharge.id])

        let bookedUpdate = try #require(cardTx1.updated.first { $0.id == pendingCharge.id })
        #expect(bookedUpdate.status == .booked)
        #expect(bookedUpdate.amount == Decimal(string: "17.40"))
        #expect(bookedUpdate.postedDate != nil)

        let rejectedUpdate = try #require(cardTx1.updated.first { $0.id == authorizedCharge.id })
        #expect(rejectedUpdate.status == .rejected)

        let cardTx2 = try await source.transactionChanges(accountID: card.id, since: cardTx1.newToken)
        #expect(cardTx2.isEmpty)
        #expect(cardTx2.newToken == cardTx1.newToken)

        // Savings transactions progress through initial deposit and interest credit.
        let savingsTx0 = try await source.transactionChanges(accountID: savings.id, since: nil)
        #expect(savingsTx0.inserted.count == 1)
        #expect(savingsTx0.inserted[0].transactionType == .deposit)

        let savingsTx1 = try await source.transactionChanges(accountID: savings.id, since: savingsTx0.newToken)
        #expect(savingsTx1.inserted.count == 1)
        #expect(savingsTx1.inserted[0].transactionType == .interest)

        let savingsTx2 = try await source.transactionChanges(accountID: savings.id, since: savingsTx1.newToken)
        #expect(savingsTx2.isEmpty)
        #expect(savingsTx2.newToken == savingsTx1.newToken)
    }

    @Test func accountChangesSupportsFollowUpAccountUpdateSteps() async throws {
        let cardID = UUID()
        let initialCard = WalletAccount(
            id: cardID,
            displayName: "Apple Card",
            institutionName: "Goldman Sachs",
            kind: .liability,
            currencyCode: "USD",
            creditLimit: Decimal(5000)
        )
        let raisedCard = WalletAccount(
            id: cardID,
            displayName: "Apple Card",
            institutionName: "Goldman Sachs",
            kind: .liability,
            currencyCode: "USD",
            creditLimit: Decimal(8000)
        )
        let fixture = WalletFixture(
            accounts: [initialCard],
            accountChanges: [WalletFixture.ChangeStep(updated: [raisedCard])],
            histories: []
        )
        let source = FakeFinanceDataSource(fixture: fixture)

        let step0 = try await source.accountChanges(since: nil)
        #expect(step0.inserted == [initialCard])

        let step1 = try await source.accountChanges(since: step0.newToken)
        #expect(step1.updated == [raisedCard])

        let step2 = try await source.accountChanges(since: step1.newToken)
        #expect(step2.isEmpty)
        #expect(step2.newToken == step1.newToken)
    }

    @Test func rejectsCorruptAndCrossStreamTokens() async throws {
        let fixture = try FakeFinanceDataSource.loadFixture()
        let source = FakeFinanceDataSource(fixture: fixture)
        let accounts = try await source.accountChanges(since: nil)
        let card = try #require(accounts.inserted.first { $0.kind == .liability })
        let savings = try #require(accounts.inserted.first { $0.kind == .asset })

        let cardBalance = try await source.balanceChanges(accountID: card.id, since: nil)
        let cardTx = try await source.transactionChanges(accountID: card.id, since: nil)

        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.accountChanges(since: Data("not-a-token".utf8))
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.accountChanges(since: Data())
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.transactionChanges(accountID: card.id, since: cardBalance.newToken)
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.balanceChanges(accountID: card.id, since: accounts.newToken)
        }
        await #expect(throws: FinanceDataError.invalidToken) {
            try await source.transactionChanges(accountID: savings.id, since: cardTx.newToken)
        }
    }

    @Test func enforcesAvailabilityAuthorizationAndInjectedErrors() async throws {
        let fixture = try FakeFinanceDataSource.loadFixture()

        let unavailable = FakeFinanceDataSource(fixture: fixture, isDataAvailable: false)
        #expect(!unavailable.isDataAvailable())
        await #expect(throws: FinanceDataError.dataUnavailable) {
            try await unavailable.accountChanges(since: nil)
        }

        let pendingAuth = FakeFinanceDataSource(
            fixture: fixture,
            authorizationStatus: .notDetermined,
            authorizationOnRequest: .authorized
        )
        #expect(try await pendingAuth.authorizationStatus() == .notDetermined)
        await #expect(throws: FinanceDataError.notAuthorized) {
            try await pendingAuth.accountChanges(since: nil)
        }
        #expect(try await pendingAuth.requestAuthorization() == .authorized)
        #expect(try await pendingAuth.authorizationStatus() == .authorized)
        let accounts = try await pendingAuth.accountChanges(since: nil)
        #expect(accounts.inserted.count == 2)

        await pendingAuth.setInjectedError(.dataUnavailable)
        await #expect(throws: FinanceDataError.dataUnavailable) {
            try await pendingAuth.accountChanges(since: nil)
        }
        await pendingAuth.setInjectedError(nil)
        await pendingAuth.setAuthorizationStatus(.denied)
        await #expect(throws: FinanceDataError.notAuthorized) {
            try await pendingAuth.accountChanges(since: nil)
        }

        let deniedOnRequest = FakeFinanceDataSource(
            fixture: fixture,
            authorizationStatus: .notDetermined,
            authorizationOnRequest: .denied
        )
        #expect(try await deniedOnRequest.requestAuthorization() == .denied)
        #expect(try await deniedOnRequest.authorizationStatus() == .denied)

        let restricted = FakeFinanceDataSource(fixture: fixture, authorizationStatus: .restricted)
        #expect(try await restricted.requestAuthorization() == .restricted)
    }

    @Test func exportedFixtureLoadsBackIntoFakeWithIdenticalTokenProgression() async throws {
        let original = try FakeFinanceDataSource.loadFixture()
        let encoded = try original.encodedJSON()
        let reloaded = try WalletFixture.decode(from: encoded)
        #expect(reloaded == original)

        let sourceA = FakeFinanceDataSource(fixture: original)
        let sourceB = FakeFinanceDataSource(fixture: reloaded)

        let accA = try await sourceA.accountChanges(since: nil)
        let accB = try await sourceB.accountChanges(since: nil)
        #expect(accA == accB)

        let cardID = try #require(accA.inserted.first { $0.kind == .liability }?.id)
        let txA0 = try await sourceA.transactionChanges(accountID: cardID, since: nil)
        let txB0 = try await sourceB.transactionChanges(accountID: cardID, since: nil)
        #expect(txA0 == txB0)

        let txA1 = try await sourceA.transactionChanges(accountID: cardID, since: txA0.newToken)
        let txB1 = try await sourceB.transactionChanges(accountID: cardID, since: txB0.newToken)
        #expect(txA1 == txB1)
    }

    @Test func sampleConvenienceLoadsBundledFixture() async throws {
        let source = FakeFinanceDataSource.sample
        let accounts = try await source.accountChanges(since: nil)
        #expect(accounts.inserted.count == 2)
    }

    @Test func unknownAccountIDReturnsEmptyRepeatableStreams() async throws {
        let source = FakeFinanceDataSource.sample
        let unknownID = UUID()

        let balance0 = try await source.balanceChanges(accountID: unknownID, since: nil)
        #expect(balance0.isEmpty)
        let balance1 = try await source.balanceChanges(accountID: unknownID, since: balance0.newToken)
        #expect(balance1.isEmpty)
        #expect(balance1.newToken == balance0.newToken)

        let tx0 = try await source.transactionChanges(accountID: unknownID, since: nil)
        #expect(tx0.isEmpty)
        let tx1 = try await source.transactionChanges(accountID: unknownID, since: tx0.newToken)
        #expect(tx1.isEmpty)
        #expect(tx1.newToken == tx0.newToken)
    }

    @Test func missingFixtureResourceThrowsFixtureError() {
        #expect(
            throws: FakeFinanceDataSource.FixtureError.missingResource(
                name: "does-not-exist",
                subdirectory: "Fixtures"
            )
        ) {
            try FakeFinanceDataSource.loadFixture(named: "does-not-exist")
        }
    }
}
