import Domain
import Foundation
import Storage
import Testing

struct FixtureFileCoderTests {
    private static let accountID = UUID(uuidString: "11111111-1111-4111-8111-111111111111") ?? UUID()
    private static let date = Date(timeIntervalSince1970: 1_800_000_000)

    private static let fixture = WalletFixture(
        accounts: [
            WalletChanges(inserted: [
                WalletAccount(
                    id: accountID,
                    displayName: "Card",
                    institutionName: "Bank",
                    kind: .liability,
                    currencyCode: "USD",
                    creditLimit: Decimal(string: "1000.50")
                )
            ])
        ],
        accountHistories: [
            WalletFixture.AccountHistory(
                accountID: accountID,
                balances: [
                    WalletChanges(updated: [
                        WalletBalance(
                            id: UUID(),
                            accountID: accountID,
                            currencyCode: "USD",
                            available: WalletBalance.Entry(
                                amount: Decimal(string: "990.25") ?? 0,
                                creditDebitIndicator: .credit,
                                asOfDate: date
                            )
                        )
                    ])
                ],
                transactions: [
                    WalletChanges(
                        inserted: [
                            WalletTransaction(
                                id: UUID(),
                                accountID: accountID,
                                amount: Decimal(string: "10.25") ?? 0,
                                currencyCode: "USD",
                                creditDebitIndicator: .debit,
                                transactionDescription: "Coffee",
                                originalTransactionDescription: "COFFEE #1",
                                merchantName: "Cafe",
                                merchantCategoryCode: 5814,
                                transactionType: .pointOfSale,
                                status: .pending,
                                transactionDate: date,
                                postedDate: date
                            )
                        ],
                        deleted: [UUID()]
                    )
                ]
            )
        ]
    )

    @Test func roundTripsUnchanged() throws {
        let encoded = try FixtureFileCoder().encode(Self.fixture)
        #expect(try FixtureFileCoder().encode(FixtureFileCoder().decode(encoded)) == encoded)
    }

    @Test func decodesTheValuesItEncoded() throws {
        let decoded = try FixtureFileCoder().decode(FixtureFileCoder().encode(Self.fixture))
        let changes = try #require(decoded.accountHistories.first?.transactions.first)
        #expect(changes.inserted.map(\.amount) == [Decimal(string: "10.25")])
        #expect(changes.inserted.first?.transactionDate == Self.date)
        #expect(changes.inserted.first?.status == .pending)
        #expect(changes.deleted == Self.fixture.accountHistories.first?.transactions.first?.deleted)
        #expect(decoded.accounts.first?.inserted.first?.creditLimit == Decimal(string: "1000.50"))
    }

    @Test func writesMoneyAsDecimalStringsAndEnumsAsNames() throws {
        let json = try #require(String(data: FixtureFileCoder().encode(Self.fixture), encoding: .utf8))
        #expect(json.contains(#""creditLimit" : "1000.5""#))
        #expect(json.contains(#""amount" : "10.25""#))
        #expect(json.contains(#""status" : "pending""#))
        #expect(json.contains(#""transactionType" : "pointOfSale""#))
        #expect(json.contains(#""schemaVersion" : 1"#))
        #expect(!json.contains(#""updated" : []"#))
    }

    @Test func rejectsAnUnknownEnumValue() throws {
        let json = try #require(String(data: FixtureFileCoder().encode(Self.fixture), encoding: .utf8))
            .replacingOccurrences(of: #""status" : "pending""#, with: #""status" : "settled""#)
        #expect(throws: DecodingError.self) {
            try FixtureFileCoder().decode(Data(json.utf8))
        }
    }
}
