import Foundation
import Testing

@testable import OpenPersonalFinanceKit

struct FinanceFixtureTests {
    @Test func sampleDecodes() throws {
        let fixture = try FinanceFixture.sample()
        let accounts = fixture.accountChanges[0].inserted
        #expect(accounts.map(\.kind) == [.liability, .asset])
        #expect(accounts[0].creditLimit == Decimal("5000"))
        #expect(fixture.accountHistories.count == 2)

        let card = fixture.accountHistories[0].transactionChanges
        #expect(card[0].inserted.first?.amount == WalletAmount(amount: Decimal("4.5"), indicator: .debit))
        #expect(card[1].updated.map(\.status) == [.booked, .rejected])
        #expect(card[1].deleted.count == 1)
    }

    @Test func sampleRoundTrips() throws {
        let fixture = try FinanceFixture.sample()
        #expect(try FinanceFixture.decode(from: fixture.encoded()) == fixture)
    }

    @Test func rejectsAnUnknownTopLevelKey() {
        expectRejected(#"{ "accountChanges": [], "acountHistories": [] }"#)
    }

    @Test func rejectsAnUnknownNestedKey() {
        expectRejected(
            #"""
            { "accountChanges": [ { "inserted": [ {
              "id": "0A000000-0000-4000-8000-000000000001", "displayName": "Card", "institutionName": "Apple",
              "kind": "liability", "currencyCode": "USD", "creditLimt": "1.00"
            } ] } ] }
            """#)
    }

    @Test func rejectsAnUnknownKeyInAStep() {
        expectRejected(#"{ "accountChanges": [ { "removed": [] } ] }"#)
    }

    @Test(arguments: ["12abc", "-1.00", "1e3", "", " 1.00"])
    func rejectsAMalformedAmount(_ amount: String) {
        expectRejected(
            #"""
            { "accountChanges": [ { "inserted": [ {
              "id": "0A000000-0000-4000-8000-000000000001", "displayName": "Card", "institutionName": "Apple",
              "kind": "liability", "currencyCode": "USD", "creditLimit": "\#(amount)"
            } ] } ] }
            """#)
    }

    @Test func amountsKeepEveryDigit() throws {
        let json = #"{ "amount": "1234567.8901", "indicator": "credit" }"#
        let amount = try JSONDecoder().decode(WalletAmount.self, from: Data(json.utf8))
        #expect(amount.amount == Decimal("1234567.8901"))
        let encoded = try JSONEncoder().encode(amount)
        #expect(String(decoding: encoded, as: UTF8.self).contains(#""1234567.8901""#))
    }

    private func expectRejected(_ json: String, sourceLocation: SourceLocation = #_sourceLocation) {
        #expect(throws: DecodingError.self, sourceLocation: sourceLocation) {
            try FinanceFixture.decode(from: Data(json.utf8))
        }
    }
}
