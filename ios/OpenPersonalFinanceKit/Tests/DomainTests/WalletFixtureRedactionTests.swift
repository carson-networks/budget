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
            WalletChanges(inserted: [
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
                    WalletChanges(inserted: [
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
                    WalletChanges(inserted: [
                        transaction(
                            "Blue Bottle Coffee",
                            original: "SQ *BLUE BOTTLE COFFEE",
                            merchant: "Blue Bottle Coffee",
                            amount: "14.50"
                        ),
                        transaction("Corner Cafe", original: "TEMP AUTH *CORNER CAFE", merchant: nil, amount: "11.89"),
                    ]),
                    WalletChanges(
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

    // Every string field, as dump prints it, so nothing can hide outside the fields checked by name.
    private static func text(of fixture: WalletFixture) -> String {
        var text = ""
        dump(fixture, to: &text)
        return text
    }

    @Test func noOriginalStringSurvives() {
        let text = Self.text(of: Self.fixture.redacted(amountFactor: 2))
        for original in Self.originals {
            #expect(!text.localizedCaseInsensitiveContains(original), "\(original) survived redaction")
        }
        #expect(text.contains("Apple Card"))
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

    @Test func isDeterministicForTheSameFactor() {
        let factor = Decimal(string: "0.73") ?? 0
        #expect(
            Self.text(of: Self.fixture.redacted(amountFactor: factor))
                == Self.text(of: Self.fixture.redacted(amountFactor: factor)))
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
}
