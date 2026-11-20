import Domain
import Foundation
import Testing

struct WalletModelsTests {
    @Test func fixtureRoundTripsExactDecimalsAndFractionalDates() throws {
        let accountID = UUID()
        let balanceID = UUID()
        let txID = UUID()
        let date = try Date.ISO8601FormatStyle(includingFractionalSeconds: true)
            .parse("2026-11-15T14:30:45.125Z")

        let creditLimit = try #require(Decimal(string: "10000.00"))
        let account = WalletAccount(
            id: accountID,
            displayName: "Apple Card",
            institutionName: "Goldman Sachs",
            kind: .liability,
            currencyCode: "USD",
            creditLimit: creditLimit
        )
        let balance = WalletBalance(
            id: balanceID,
            accountID: accountID,
            currencyCode: "USD",
            available: WalletBalance.Entry(
                amount: try #require(Decimal(string: "9980.01")),
                creditDebitIndicator: .credit,
                asOfDate: date
            ),
            booked: WalletBalance.Entry(
                amount: try #require(Decimal(string: "19.99")),
                creditDebitIndicator: .debit,
                asOfDate: date
            )
        )
        let transaction = WalletTransaction(
            id: txID,
            accountID: accountID,
            amount: try #require(Decimal(string: "19.99")),
            currencyCode: "USD",
            creditDebitIndicator: .debit,
            transactionDescription: "Coffee Roasters",
            originalTransactionDescription: "SQ *COFFEE ROASTERS",
            merchantName: "Coffee Roasters",
            merchantCategoryCode: 5814,
            transactionType: .pointOfSale,
            status: .booked,
            transactionDate: date,
            postedDate: date
        )
        let fixture = WalletFixture(
            accounts: [account],
            histories: [
                WalletFixture.AccountHistory(
                    accountID: accountID,
                    balanceChanges: [WalletFixture.ChangeStep(inserted: [balance])],
                    transactionChanges: [WalletFixture.ChangeStep(inserted: [transaction])]
                )
            ]
        )

        let data = try fixture.encodedJSON()
        let decoded = try WalletFixture.decode(from: data)
        #expect(decoded == fixture)

        let jsonString = try #require(String(data: data, encoding: .utf8))
        #expect(jsonString.contains("\"amount\" : \"19.99\""))
    }

    @Test(arguments: ["", "12.34abc", "1,000.00", " 12.34", "12.34 ", "NaN", "1e5", ".5", "5.", "-"])
    func rejectsMalformedDecimalStrings(invalidAmount: String) {
        let json = Data(
            """
            {
              "id": "11111111-1111-4111-8111-111111111111",
              "displayName": "Apple Card",
              "institutionName": "Goldman Sachs",
              "kind": "liability",
              "currencyCode": "USD",
              "creditLimit": "\(invalidAmount)"
            }
            """.utf8
        )

        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(WalletAccount.self, from: json)
        }
    }

    @Test func rejectsNumericJSONForMoneyFields() {
        let json = Data(
            """
            {
              "id": "11111111-1111-4111-8111-111111111111",
              "displayName": "Apple Card",
              "institutionName": "Goldman Sachs",
              "kind": "liability",
              "currencyCode": "USD",
              "creditLimit": 10000.00
            }
            """.utf8
        )

        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(WalletAccount.self, from: json)
        }
    }

    @Test func rejectsUnsupportedSchemaVersion() {
        let json = Data(
            """
            {
              "schemaVersion": 99,
              "accounts": [],
              "histories": []
            }
            """.utf8
        )

        #expect(throws: DecodingError.self) {
            try WalletFixture.decode(from: json)
        }
    }

    @Test func rejectsDuplicateAccountHistories() {
        let json = Data(
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                { "accountID": "11111111-1111-4111-8111-111111111111" },
                { "accountID": "11111111-1111-4111-8111-111111111111" }
              ]
            }
            """.utf8
        )

        #expect(throws: DecodingError.self) {
            try WalletFixture.decode(from: json)
        }
    }
}
