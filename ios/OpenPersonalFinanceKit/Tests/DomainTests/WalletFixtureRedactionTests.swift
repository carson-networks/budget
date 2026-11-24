import Domain
import Foundation
import Testing

struct WalletFixtureRedactionTests {
    private static let accountID = UUID()
    private static let date = Date(timeIntervalSince1970: 1_800_000_000)
    private static let originals = [
        "Blue Bottle Coffee", "SQ *BLUE BOTTLE COFFEE", "Corner Cafe", "TEMP AUTH *CORNER CAFE", "CORNER CAFE 11/15",
    ]

    private static func transaction(
        _ description: String,
        original: String,
        merchant: String?,
        amount: String
    ) -> WalletTransaction {
        WalletTransaction(
            id: UUID(),
            accountID: accountID,
            amount: Decimal(string: amount) ?? 0,
            currencyCode: "USD",
            creditDebitIndicator: .debit,
            transactionDescription: description,
            originalTransactionDescription: original,
            merchantName: merchant,
            merchantCategoryCode: 5814,
            transactionType: .pointOfSale,
            status: .pending,
            transactionDate: date
        )
    }

    private static func entry(_ amount: String) -> WalletBalance.Entry {
        WalletBalance.Entry(amount: Decimal(string: amount) ?? 0, creditDebitIndicator: .debit, asOfDate: date)
    }

    private static let fixture = WalletFixture(
        accounts: [
            WalletFixtureStep(inserted: [
                WalletAccount(
                    id: accountID,
                    displayName: "Apple Card",
                    institutionName: "Goldman Sachs",
                    kind: .liability,
                    currencyCode: "USD",
                    creditLimit: Decimal(string: "10000.00")
                )
            ])
        ],
        accountHistories: [
            WalletFixture.AccountHistory(
                accountID: accountID,
                balances: [
                    WalletFixtureStep(inserted: [
                        WalletBalance(
                            id: UUID(),
                            accountID: accountID,
                            currencyCode: "USD",
                            available: entry("9864.36"),
                            booked: entry("59.25")
                        )
                    ])
                ],
                transactions: [
                    WalletFixtureStep(inserted: [
                        transaction(
                            "Blue Bottle Coffee",
                            original: "SQ *BLUE BOTTLE COFFEE",
                            merchant: "Blue Bottle Coffee",
                            amount: "14.50"
                        ),
                        transaction("Corner Cafe", original: "TEMP AUTH *CORNER CAFE", merchant: nil, amount: "11.89"),
                    ]),
                    WalletFixtureStep(
                        updated: [
                            transaction(
                                "Corner Cafe",
                                original: "CORNER CAFE 11/15",
                                merchant: "Corner Cafe",
                                amount: "12.00"
                            )
                        ],
                        deleted: [UUID()]
                    ),
                ]
            )
        ]
    )

    private var transactions: [WalletTransaction] {
        let steps = Self.fixture.redacted(amountFactor: 2).accountHistories[0].transactions
        return steps.flatMap { $0.inserted + $0.updated }
    }

    @Test func noOriginalStringSurvives() throws {
        let json = try #require(String(data: Self.fixture.redacted(amountFactor: 2).encoded(), encoding: .utf8))
        for original in Self.originals {
            #expect(!json.localizedCaseInsensitiveContains(original), "\(original) survived redaction")
        }
        #expect(json.contains("Apple Card"))
    }

    @Test func samePlaceholderForTheSameTextAcrossFieldsAndSteps() {
        let coffee = transactions[0]
        #expect(coffee.transactionDescription == coffee.merchantName)
        #expect(coffee.transactionDescription != coffee.originalTransactionDescription)

        let cafePending = transactions[1]
        let cafeLater = transactions[2]
        #expect(cafePending.merchantName == nil)
        #expect(cafePending.transactionDescription == cafeLater.transactionDescription)
        #expect(cafeLater.merchantName == cafeLater.transactionDescription)
        #expect(cafePending.originalTransactionDescription != cafeLater.originalTransactionDescription)
        #expect(Set(transactions.map(\.transactionDescription)).allSatisfy { $0.hasPrefix("Redacted ") })
    }

    @Test func isDeterministicForTheSameFactor() throws {
        let first = try Self.fixture.redacted(amountFactor: Decimal(string: "0.73") ?? 0).encoded()
        let second = try Self.fixture.redacted(amountFactor: Decimal(string: "0.73") ?? 0).encoded()
        #expect(first == second)
    }

    @Test func scalesEveryAmountAndRoundsToCents() throws {
        let redacted = Self.fixture.redacted(amountFactor: Decimal(string: "1.37") ?? 0)
        let account = try #require(redacted.accounts.first?.inserted.first)
        #expect(account.creditLimit == Decimal(string: "13700"))

        let history = try #require(redacted.accountHistories.first)
        let balance = try #require(history.balances.first?.inserted.first)
        #expect(balance.available?.amount == Decimal(string: "13514.17"))
        #expect(balance.booked?.amount == Decimal(string: "81.17"))
        #expect(history.transactions[0].inserted.map(\.amount) == [Decimal(string: "19.87"), Decimal(string: "16.29")])
    }

    @Test func keepsIDsStatusesAndDeletions() {
        let redacted = Self.fixture.redacted(amountFactor: 2)
        let original = Self.fixture.accountHistories[0].transactions
        let result = redacted.accountHistories[0].transactions
        #expect(result.map { $0.inserted.map(\.id) } == original.map { $0.inserted.map(\.id) })
        #expect(result[1].deleted == original[1].deleted)
        #expect(result[0].inserted.map(\.status) == [.pending, .pending])
    }

    @Test func randomFactorIsNeverOne() {
        for _ in 0..<2_000 {
            let factor = WalletFixture.randomAmountFactor()
            #expect(factor != 1)
            #expect(factor > Decimal(string: "0.5") ?? 0 && factor < Decimal(string: "1.5") ?? 0)
        }
    }

    @Test func roundTripsThroughJSON() throws {
        let decoded = try WalletFixture.decode(from: Self.fixture.encoded())
        let transactions = decoded.accountHistories[0].transactions
        #expect(transactions.map(\.inserted.count) == [2, 0])
        #expect(transactions[0].inserted.map(\.amount) == [Decimal(string: "14.50"), Decimal(string: "11.89")])
        #expect(transactions[0].inserted.first?.transactionDate == Self.date)
        #expect(decoded.accounts.first?.inserted.first?.creditLimit == Decimal(string: "10000"))
        #expect(transactions[1].deleted == Self.fixture.accountHistories[0].transactions[1].deleted)
    }
}
