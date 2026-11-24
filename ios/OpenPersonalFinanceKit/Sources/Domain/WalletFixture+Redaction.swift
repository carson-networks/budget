import Foundation

extension WalletFixture {
    // Same text in, same placeholder out, so equal descriptions and merchants stay equal after redaction.
    package func redacted(amountFactor: Decimal) -> WalletFixture {
        var redactor = Redactor(amountFactor: amountFactor)
        let accounts = accounts.map { $0.map { redactor.account($0) } }
        let histories = accountHistories.map { history in
            AccountHistory(
                accountID: history.accountID,
                balances: history.balances.map { $0.map { redactor.balance($0) } },
                transactions: history.transactions.map { $0.map { redactor.transaction($0) } }
            )
        }
        return WalletFixture(accounts: accounts, accountHistories: histories)
    }

    // Never exactly 1, so a redacted export never carries the original amounts.
    package static func randomAmountFactor() -> Decimal {
        let percent = Int.random(in: 51...148)
        return Decimal(percent >= 100 ? percent + 1 : percent) / 100
    }
}

private struct Redactor {
    let amountFactor: Decimal
    private var placeholders: [String: String] = [:]

    init(amountFactor: Decimal) {
        self.amountFactor = amountFactor
    }

    mutating func placeholder(for text: String) -> String {
        if let existing = placeholders[text] {
            return existing
        }
        let placeholder = "Redacted \(placeholders.count + 1)"
        placeholders[text] = placeholder
        return placeholder
    }

    func scaled(_ amount: Decimal) -> Decimal {
        var product = amount * amountFactor
        var rounded = Decimal()
        NSDecimalRound(&rounded, &product, 2, .plain)
        return rounded
    }

    func account(_ account: WalletAccount) -> WalletAccount {
        WalletAccount(
            id: account.id,
            displayName: account.displayName,
            institutionName: account.institutionName,
            kind: account.kind,
            currencyCode: account.currencyCode,
            creditLimit: account.creditLimit.map(scaled)
        )
    }

    func balance(_ balance: WalletBalance) -> WalletBalance {
        WalletBalance(
            id: balance.id,
            accountID: balance.accountID,
            currencyCode: balance.currencyCode,
            available: balance.available.map(entry),
            booked: balance.booked.map(entry)
        )
    }

    func entry(_ entry: WalletBalance.Entry) -> WalletBalance.Entry {
        WalletBalance.Entry(
            amount: scaled(entry.amount),
            creditDebitIndicator: entry.creditDebitIndicator,
            asOfDate: entry.asOfDate
        )
    }

    mutating func transaction(_ transaction: WalletTransaction) -> WalletTransaction {
        WalletTransaction(
            id: transaction.id,
            accountID: transaction.accountID,
            amount: scaled(transaction.amount),
            currencyCode: transaction.currencyCode,
            creditDebitIndicator: transaction.creditDebitIndicator,
            transactionDescription: placeholder(for: transaction.transactionDescription),
            originalTransactionDescription: placeholder(for: transaction.originalTransactionDescription),
            merchantName: transaction.merchantName.map { placeholder(for: $0) },
            merchantCategoryCode: transaction.merchantCategoryCode,
            transactionType: transaction.transactionType,
            status: transaction.status,
            transactionDate: transaction.transactionDate,
            postedDate: transaction.postedDate
        )
    }
}
