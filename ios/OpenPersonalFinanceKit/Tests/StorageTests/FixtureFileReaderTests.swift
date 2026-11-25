import Domain
import Fakes
import Foundation
import Storage
import Testing

struct FixtureFileReaderTests {
    private static let card = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()

    private static func fixture(accounts: String = "[]", histories: String = "[]") -> String {
        #"{ "schemaVersion": 1, "accounts": \#(accounts), "accountHistories": \#(histories) }"#
    }

    private static func history(balances: String = "[]", transactions: String = "[]") -> String {
        #"[{ "accountID": "11111111-1111-4111-8111-111111111111", "balances": \#(balances), "transactions": \#(transactions) }]"#
    }

    @Test func sampleFixtureDecodes() throws {
        let fixture = try FixtureFiles.load(named: "sample")
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
            try FixtureFileReader().read(Data(json.utf8))
        }
    }

    @Test(arguments: [
        #"{ "accounts": [], "accountHistories": [] }"#,
        #"{ "schemaVersion": 2, "accounts": [], "accountHistories": [] }"#,
    ])
    func rejectsMissingOrUnsupportedSchemaVersion(json: String) {
        #expect(throws: DecodingError.self) {
            try FixtureFileReader().read(Data(json.utf8))
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
            try FixtureFileReader().read(Data(json.utf8))
        }
    }

    @Test func readsEveryField() throws {
        let fixture = try FixtureFileReader().read(
            Data(
                Self.fixture(
                    accounts:
                        #"[{ "inserted": [{ "id": "11111111-1111-4111-8111-111111111111", "displayName": "Card", "institutionName": "Bank", "kind": "liability", "currencyCode": "USD", "creditLimit": "1000.50" }] }]"#,
                    histories: Self.history(
                        balances:
                            #"[{ "updated": [{ "id": "21111111-1111-4111-8111-111111111111", "accountID": "11111111-1111-4111-8111-111111111111", "currencyCode": "USD", "available": { "amount": "990.25", "creditDebitIndicator": "credit", "asOfDate": "2026-11-15T12:00:00Z" } }] }]"#,
                        transactions:
                            #"[{ "inserted": [{ "id": "31111111-1111-4111-8111-111111111101", "accountID": "11111111-1111-4111-8111-111111111111", "amount": "10.25", "currencyCode": "USD", "creditDebitIndicator": "debit", "transactionDescription": "Coffee", "originalTransactionDescription": "COFFEE #1", "merchantName": "Cafe", "merchantCategoryCode": 5814, "transactionType": "pointOfSale", "status": "pending", "transactionDate": "2026-11-15T09:00:00Z", "postedDate": "2026-11-16T09:00:00Z" }], "deleted": ["31111111-1111-4111-8111-111111111102"] }]"#
                    )
                ).utf8
            )
        )
        let account = try #require(fixture.accounts.first?.inserted.first)
        #expect(account.kind == .liability)
        #expect(account.creditLimit == Decimal(string: "1000.50"))

        let history = try #require(fixture.accountHistories.first)
        let balance = try #require(history.balances.first?.updated.first)
        #expect(balance.available?.amount == Decimal(string: "990.25"))
        #expect(balance.available?.creditDebitIndicator == .credit)

        let changes = try #require(history.transactions.first)
        let transaction = try #require(changes.inserted.first)
        #expect(transaction.amount == Decimal(string: "10.25"))
        #expect(transaction.status == .pending)
        #expect(transaction.transactionType == .pointOfSale)
        #expect(transaction.merchantCategoryCode == 5814)
        #expect(transaction.transactionDate == ISO8601DateFormatter().date(from: "2026-11-15T09:00:00Z"))
        #expect(transaction.postedDate == ISO8601DateFormatter().date(from: "2026-11-16T09:00:00Z"))
        #expect(changes.deleted == [UUID(uuidString: "31111111-1111-4111-8111-111111111102")].compactMap { $0 })
    }

    @Test func rejectsAnUnknownEnumValue() {
        let json = Self.fixture(
            accounts:
                #"[{ "inserted": [{ "id": "11111111-1111-4111-8111-111111111111", "displayName": "Card", "institutionName": "Bank", "kind": "card", "currencyCode": "USD" }] }]"#
        )
        #expect(throws: DecodingError.self) {
            try FixtureFileReader().read(Data(json.utf8))
        }
    }
}
