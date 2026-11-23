# Wallet fixtures

JSON fixtures decoded into `Domain.WalletFixture` and served by `FakeFinanceDataSource` in unit tests, SwiftUI previews and the Simulator.

- `sample.json`: hand-written. One liability card (`Apple Card`) with booked, pending and authorized charges and a refund, and one asset account (`Savings`) with a deposit.

## Format

The fixture holds a single state: every read returns all of it.

```json
{
  "accounts": [
    {
      "id": "<uuid>",
      "displayName": "Apple Card",
      "institutionName": "Goldman Sachs",
      "kind": "asset | liability",
      "currencyCode": "USD",
      "creditLimit": "10000.00"
    }
  ],
  "balances": [
    {
      "id": "<uuid>",
      "accountID": "<uuid>",
      "currencyCode": "USD",
      "available": { "amount": "9864.36", "creditDebitIndicator": "credit", "asOfDate": "2026-11-15T12:00:00Z" },
      "booked": { "amount": "59.25", "creditDebitIndicator": "debit", "asOfDate": "2026-11-15T12:00:00Z" }
    }
  ],
  "transactions": [
    {
      "id": "<uuid>",
      "accountID": "<uuid>",
      "amount": "14.50",
      "currencyCode": "USD",
      "creditDebitIndicator": "debit",
      "transactionDescription": "Blue Bottle Coffee",
      "originalTransactionDescription": "BLUE BOTTLE COFFEE #12",
      "merchantName": "Blue Bottle Coffee",
      "merchantCategoryCode": 5814,
      "transactionType": "pointOfSale",
      "status": "pending",
      "transactionDate": "2026-11-15T09:15:00Z"
    }
  ]
}
```

- Decoding rejects unknown keys at every level, so typos fail immediately.
- Money (`creditLimit`, `amount`) is a decimal string, never a JSON number, so it never passes through `Double`.
- Dates are ISO 8601 (`asOfDate`, `transactionDate`, optional `postedDate`).
- `creditLimit`, `available`, `booked`, `merchantName`, `merchantCategoryCode` and `postedDate` are optional.
- `status` is `authorized`, `pending`, `booked` or `rejected`. Memo transactions are dropped when FinanceKit is read and never appear here.
- `transactionType` uses FinanceKit's `TransactionType` case names (`pointOfSale`, `refund`, `deposit`, `interest`, `unknown`, ...).
