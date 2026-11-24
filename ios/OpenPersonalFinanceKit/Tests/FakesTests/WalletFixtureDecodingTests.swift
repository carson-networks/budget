import Domain
import Fakes
import Foundation
import Testing

struct WalletFixtureDecodingTests {
    private static let card = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()

    @Test func sampleFixtureDecodes() throws {
        let fixture = try FakeFinanceDataSource.loadFixture(named: "sample")
        #expect(fixture.accounts.count == 1)
        #expect(fixture.accounts.first?.inserted.count == 2)
        #expect(fixture.accountHistories.count == 2)

        let card = try #require(fixture.history(for: Self.card))
        #expect(card.balances.count == 2)
        #expect(card.transactions.map(\.inserted.count) == [5, 1])
        #expect(card.transactions.last?.updated.map(\.status) == [.booked, .rejected])
        #expect(card.transactions.last?.deleted.count == 1)
    }

    @Test(arguments: [
        ("fixture", #"{ "schemaVersion": 1, "accounts": [], "accountHistories": [], "extra": true }"#),
        ("step", #"{ "schemaVersion": 1, "accounts": [{ "inserted": [], "extra": 1 }], "accountHistories": [] }"#),
        (
            "account history",
            #"{ "schemaVersion": 1, "accounts": [], "accountHistories": [{ "accountID": "11111111-1111-4111-8111-111111111111", "extra": 1 }] }"#
        ),
        (
            "account",
            #"{ "schemaVersion": 1, "accounts": [{ "inserted": [{ "id": "11111111-1111-4111-8111-111111111111", "displayName": "Card", "institutionName": "Bank", "kind": "liability", "currencyCode": "USD", "extra": 1 }] }], "accountHistories": [] }"#
        ),
        (
            "balance",
            #"{ "schemaVersion": 1, "accounts": [], "accountHistories": [{ "accountID": "11111111-1111-4111-8111-111111111111", "balances": [{ "inserted": [{ "id": "21111111-1111-4111-8111-111111111111", "accountID": "11111111-1111-4111-8111-111111111111", "currencyCode": "USD", "extra": 1 }] }] }] }"#
        ),
        (
            "balance entry",
            #"{ "schemaVersion": 1, "accounts": [], "accountHistories": [{ "accountID": "11111111-1111-4111-8111-111111111111", "balances": [{ "inserted": [{ "id": "21111111-1111-4111-8111-111111111111", "accountID": "11111111-1111-4111-8111-111111111111", "currencyCode": "USD", "booked": { "amount": "1.00", "creditDebitIndicator": "debit", "asOfDate": "2026-11-15T12:00:00Z", "extra": 1 } }] }] }] }"#
        ),
        (
            "transaction",
            #"{ "schemaVersion": 1, "accounts": [], "accountHistories": [{ "accountID": "11111111-1111-4111-8111-111111111111", "transactions": [{ "updated": [{ "id": "31111111-1111-4111-8111-111111111101", "accountID": "11111111-1111-4111-8111-111111111111", "amount": "12.00", "currencyCode": "USD", "creditDebitIndicator": "debit", "transactionDescription": "Coffee", "originalTransactionDescription": "COFFEE", "transactionType": "pointOfSale", "status": "booked", "transactionDate": "2026-11-15T12:00:00Z", "extra": 1 }] }] }] }"#
        ),
    ])
    func rejectsUnknownKeys(level: String, json: String) {
        #expect(throws: DecodingError.self, "unknown key at \(level) level") {
            try WalletFixture.decode(from: Data(json.utf8))
        }
    }

    @Test(arguments: [
        #"{ "accounts": [], "accountHistories": [] }"#,
        #"{ "schemaVersion": 2, "accounts": [], "accountHistories": [] }"#,
    ])
    func rejectsMissingOrUnsupportedSchemaVersion(json: String) {
        #expect(throws: DecodingError.self) {
            try WalletFixture.decode(from: Data(json.utf8))
        }
    }

    @Test(arguments: [
        #""12.34abc""#, #""1,000.00""#, #"" 12.34""#, #""NaN""#, #""1e5""#, #"".5""#, #""5.""#, "10000.00",
    ])
    func rejectsMoneyThatIsNotADecimalString(creditLimit: String) {
        let json = #"""
            { "schemaVersion": 1, "accounts": [{ "inserted": [{ "id": "11111111-1111-4111-8111-111111111111", "displayName": "Card", "institutionName": "Bank", "kind": "liability", "currencyCode": "USD", "creditLimit": \#(creditLimit) }] }], "accountHistories": [] }
            """#
        #expect(throws: DecodingError.self) {
            try WalletFixture.decode(from: Data(json.utf8))
        }
    }
}
