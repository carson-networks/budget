# Wallet fixtures

JSON fixtures decoded into `Domain.WalletFixture` and served by `FakeFinanceDataSource` in unit tests, SwiftUI previews and the Simulator. The diagnostics screen's **Export Fixture** writes the same format.

- `sample.json`: hand-written. One liability card (`Apple Card`) and one asset account (`Savings`). The card's first step has booked, pending and authorized charges and a refund; its second step books the pending coffee (same ID, updated), rejects the hotel hold, deletes the temporary café authorization, adds a new pending charge and updates the balance.

## Format

Each stream is an ordered list of steps. A step is what one read moves past: the fake serves step 0 for no token, then one step per token it handed out, then empty change sets that keep the last token. Accounts are one store-wide stream, as in FinanceKit; balances and transactions have one stream per account.

```json
{
  "schemaVersion": 1,
  "accounts": [
    {
      "inserted": [
        {
          "id": "<uuid>",
          "displayName": "Apple Card",
          "institutionName": "Goldman Sachs",
          "kind": "asset | liability",
          "currencyCode": "USD",
          "creditLimit": "10000.00"
        }
      ]
    }
  ],
  "accountHistories": [
    {
      "accountID": "<uuid>",
      "balances": [
        {
          "inserted": [
            {
              "id": "<uuid>",
              "accountID": "<uuid>",
              "currencyCode": "USD",
              "available": { "amount": "9864.36", "creditDebitIndicator": "credit", "asOfDate": "2026-11-15T12:00:00Z" },
              "booked": { "amount": "59.25", "creditDebitIndicator": "debit", "asOfDate": "2026-11-15T12:00:00Z" }
            }
          ]
        }
      ],
      "transactions": [
        {
          "inserted": [
            {
              "id": "<uuid>",
              "accountID": "<uuid>",
              "amount": "14.50",
              "currencyCode": "USD",
              "creditDebitIndicator": "debit",
              "transactionDescription": "Blue Bottle Coffee",
              "originalTransactionDescription": "SQ *BLUE BOTTLE COFFEE",
              "merchantName": "Blue Bottle Coffee",
              "merchantCategoryCode": 5814,
              "transactionType": "pointOfSale",
              "status": "pending",
              "transactionDate": "2026-11-15T09:15:00Z"
            }
          ]
        },
        { "updated": [ { "...": "the same transaction, now booked" } ], "deleted": ["<uuid>"] }
      ]
    }
  ]
}
```

- `schemaVersion` must be `1`; anything else is refused.
- Decoding rejects unknown keys at every level, so typos fail immediately.
- In a step, `inserted`, `updated` and `deleted` (a list of IDs) are each optional. In an account history, `balances` and `transactions` are optional.
- Money (`creditLimit`, `amount`) is a decimal string, never a JSON number, so it never passes through `Double`.
- Dates are ISO 8601 (`asOfDate`, `transactionDate`, optional `postedDate`).
- `creditLimit`, `available`, `booked`, `merchantName`, `merchantCategoryCode` and `postedDate` are optional.
- `status` is `authorized`, `pending`, `booked` or `rejected`. Memo transactions are dropped when FinanceKit is read and never appear here.
- `transactionType` uses FinanceKit's `TransactionType` case names (`pointOfSale`, `refund`, `deposit`, `interest`, `unknown`, ...).

## Exports

An export holds the diagnostics screen's full read as step 0, then one step per **Read Again from Saved Token** since. With **Redact** on (the default), descriptions and merchant names become `Redacted <n>` placeholders (the same text always gets the same placeholder) and every amount is scaled by one random factor per export, rounded to cents. IDs, dates, statuses and merchant category codes are kept.
