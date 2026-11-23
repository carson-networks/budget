import Domain
import Fakes
import Foundation
import Testing

struct WalletFixtureDecodingTests {
    @Test func sampleFixtureDecodes() throws {
        let fixture = try FakeFinanceDataSource.loadFixture(named: "sample")
        #expect(fixture.accounts.count == 2)
        #expect(fixture.balances.count == 2)
        #expect(fixture.transactions.count == 6)
    }

    @Test(arguments: [
        ("fixture", #"{ "accounts": [], "balances": [], "transactions": [], "extra": true }"#),
        (
            "account",
            #"{ "accounts": [{ "id": "11111111-1111-4111-8111-111111111111", "displayName": "Card", "institutionName": "Bank", "kind": "liability", "currencyCode": "USD", "extra": 1 }], "balances": [], "transactions": [] }"#
        ),
        (
            "balance",
            #"{ "accounts": [], "balances": [{ "id": "21111111-1111-4111-8111-111111111111", "accountID": "11111111-1111-4111-8111-111111111111", "currencyCode": "USD", "extra": 1 }], "transactions": [] }"#
        ),
        (
            "balance entry",
            #"{ "accounts": [], "balances": [{ "id": "21111111-1111-4111-8111-111111111111", "accountID": "11111111-1111-4111-8111-111111111111", "currencyCode": "USD", "booked": { "amount": "1.00", "creditDebitIndicator": "debit", "asOfDate": "2026-11-15T12:00:00Z", "extra": 1 } }], "transactions": [] }"#
        ),
        (
            "transaction",
            #"{ "accounts": [], "balances": [], "transactions": [{ "id": "31111111-1111-4111-8111-111111111101", "accountID": "11111111-1111-4111-8111-111111111111", "amount": "12.00", "currencyCode": "USD", "creditDebitIndicator": "debit", "transactionDescription": "Coffee", "originalTransactionDescription": "COFFEE", "transactionType": "pointOfSale", "status": "booked", "transactionDate": "2026-11-15T12:00:00Z", "extra": 1 }] }"#
        ),
    ])
    func rejectsUnknownKeys(level: String, json: String) {
        #expect(throws: DecodingError.self, "unknown key at \(level) level") {
            try WalletFixture.decode(from: Data(json.utf8))
        }
    }

    @Test(arguments: [
        #""12.34abc""#, #""1,000.00""#, #"" 12.34""#, #""NaN""#, #""1e5""#, #"".5""#, #""5.""#, "10000.00",
    ])
    func rejectsMoneyThatIsNotADecimalString(creditLimit: String) {
        let json = #"""
            { "accounts": [{ "id": "11111111-1111-4111-8111-111111111111", "displayName": "Card", "institutionName": "Bank", "kind": "liability", "currencyCode": "USD", "creditLimit": \#(creditLimit) }], "balances": [], "transactions": [] }
            """#
        #expect(throws: DecodingError.self) {
            try WalletFixture.decode(from: Data(json.utf8))
        }
    }
}
