# Finance fixtures

JSON read by `FakeFinanceDataSource` through `FinanceFixture.decode(from:)`. The diagnostics screen's fixture export writes the same format.

`sample.json` is hand-written: an Apple Card and a Savings account. On the card, a pending coffee charge books in step 1, an authorized charge is rejected in step 1, and a parking charge is deleted in step 1.

## Shape

```json
{
  "accountChanges": [Step<WalletAccount>],
  "accountHistories": [
    {
      "accountID": "UUID",
      "balanceChanges": [Step<WalletBalance>],
      "transactionChanges": [Step<WalletTransaction>]
    }
  ]
}
```

A `Step` is `{ "inserted": [item], "updated": [item], "deleted": ["UUID"] }`; each key may be left out when empty.

Steps are ordered. The fake shows step 0 of every list at first, and one more step each time `advance()` is called. Reading with a saved token returns the steps since that token merged into one change set, the way the real source drains FinanceKit's history.

## Rules

- Keys are the Swift property names. Unknown keys are an error, so a typo fails loudly.
- Amounts and credit limits are non-negative decimal strings (`"4.50"`), never JSON numbers. The direction is the amount's `indicator`, `credit` or `debit`.
- Dates are ISO 8601 with a time zone and no fractional seconds (`2026-11-10T08:15:00Z`).
- Optional fields (`creditLimit`, `available`, `booked`, `merchantName`, `merchantCategoryCode`, `postedDate`) may be left out.
- Enum values: account `kind` is `asset` or `liability`; transaction `status` is `authorized`, `pending`, `booked`, `rejected` or `memo`; `transactionType` is one of `WalletTransaction.TransactionType`'s cases.
- A fixture captured from a real phone is redacted before it is committed.
