import Domain
import Fakes
import Foundation
import Testing

struct WalletFixtureDecodingTests {
    @Test func sampleFixtureDecodesWithStrictKeyValidation() throws {
        let fixture = try FakeFinanceDataSource.loadFixture(named: "sample")
        #expect(fixture.schemaVersion == WalletFixture.currentSchemaVersion)
        #expect(fixture.accounts.count == 2)
        #expect(fixture.histories.count == 2)
    }

    @Test(arguments: [
        (
            "top-level fixture",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [],
              "unexpectedField": true
            }
            """
        ),
        (
            "account object",
            """
            {
              "schemaVersion": 1,
              "accounts": [
                {
                  "id": "11111111-1111-4111-8111-111111111111",
                  "displayName": "Apple Card",
                  "institutionName": "Goldman Sachs",
                  "kind": "liability",
                  "currencyCode": "USD",
                  "extraAccountKey": "nope"
                }
              ],
              "histories": []
            }
            """
        ),
        (
            "accountChanges step",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "accountChanges": [
                { "inserted": [], "bogus": [] }
              ],
              "histories": []
            }
            """
        ),
        (
            "account history",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                {
                  "accountID": "11111111-1111-4111-8111-111111111111",
                  "balanceChanges": [],
                  "transactionChanges": [],
                  "stray": 1
                }
              ]
            }
            """
        ),
        (
            "balance change step",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                {
                  "accountID": "11111111-1111-4111-8111-111111111111",
                  "balanceChanges": [
                    { "inserted": [], "unknownStepField": [] }
                  ]
                }
              ]
            }
            """
        ),
        (
            "balance object",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                {
                  "accountID": "11111111-1111-4111-8111-111111111111",
                  "balanceChanges": [
                    {
                      "inserted": [
                        {
                          "id": "21111111-1111-4111-8111-111111111111",
                          "accountID": "11111111-1111-4111-8111-111111111111",
                          "currencyCode": "USD",
                          "extraBalanceField": 42
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            """
        ),
        (
            "balance entry",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                {
                  "accountID": "11111111-1111-4111-8111-111111111111",
                  "balanceChanges": [
                    {
                      "inserted": [
                        {
                          "id": "21111111-1111-4111-8111-111111111111",
                          "accountID": "11111111-1111-4111-8111-111111111111",
                          "currencyCode": "USD",
                          "booked": {
                            "amount": "10.00",
                            "creditDebitIndicator": "debit",
                            "asOfDate": "2026-11-15T12:00:00Z",
                            "extraEntryField": "bad"
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            """
        ),
        (
            "transaction change step",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                {
                  "accountID": "11111111-1111-4111-8111-111111111111",
                  "transactionChanges": [
                    { "inserted": [], "typoUpdated": [] }
                  ]
                }
              ]
            }
            """
        ),
        (
            "transaction object",
            """
            {
              "schemaVersion": 1,
              "accounts": [],
              "histories": [
                {
                  "accountID": "11111111-1111-4111-8111-111111111111",
                  "transactionChanges": [
                    {
                      "inserted": [
                        {
                          "id": "31111111-1111-4111-8111-111111111101",
                          "accountID": "11111111-1111-4111-8111-111111111111",
                          "amount": "12.00",
                          "currencyCode": "USD",
                          "creditDebitIndicator": "debit",
                          "transactionDescription": "Coffee",
                          "originalTransactionDescription": "COFFEE",
                          "transactionType": "pointOfSale",
                          "status": "booked",
                          "transactionDate": "2026-11-15T12:00:00Z",
                          "unknownTxField": "reject-me"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            """
        ),
    ])
    func rejectsUnknownFieldsAtEveryNestingLevel(location: String, json: String) {
        let data = Data(json.utf8)
        #expect(throws: DecodingError.self, "Expected unknown key rejection in \(location)") {
            try WalletFixture.decode(from: data)
        }
    }
}
