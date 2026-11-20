# Wallet Fixtures

JSON fixtures decoded into `Domain.WalletFixture` and served by `FakeFinanceDataSource` in unit tests, SwiftUI previews, and the Simulator.

## Layout

- `sample.json`: hand-written fixture covering one liability card (`Apple Card`), one asset account (`Savings`), a pending charge that later books with a different amount, an authorized charge that later becomes `rejected`, and a pending charge that later appears in `deleted`.
- `Phone/` (phase 2): redacted fixtures exported from real devices. Never commit unredacted phone exports.

## Format (`schemaVersion: 1`)

Decoding rejects any unknown JSON key at every level so schema drift or typos fail immediately.

- **Money amounts** (`creditLimit`, `amount`) are decimal strings (for example `"14.50"`), never JSON numbers, so money never passes through `Double`.
- **Dates** (`asOfDate`, `transactionDate`, `postedDate`) are ISO 8601 strings with or without fractional seconds (for example `"2026-11-15T12:00:00Z"`).
- **IDs** are RFC 4122 UUID strings.

```json
{
  "schemaVersion": 1,
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
  "accountChanges": [
    { "inserted": [], "updated": [], "deleted": [] }
  ],
  "histories": [
    {
      "accountID": "<uuid>",
      "balanceChanges": [
        { "inserted": [], "updated": [], "deleted": [] }
      ],
      "transactionChanges": [
        { "inserted": [], "updated": [], "deleted": [] }
      ]
    }
  ]
}
```

### Field notes

- `accountChanges` is optional (defaults to `[]`). `FakeFinanceDataSource.accountChanges(since: nil)` returns `accounts` as step 0, then serves each entry in `accountChanges` on subsequent token calls.
- Each entry in `histories` must have a unique `accountID`. `balanceChanges` and `transactionChanges` are ordered change steps served one step per token call (`nil` returns step 0, each returned `newToken` advances by one step, and calls at the end return an empty `ChangeSet` with the same token).
- Inside a change step, `inserted`, `updated`, and `deleted` each default to `[]` if omitted.
- `WalletBalance` carries optional `available` and `booked` entries (`amount`, `creditDebitIndicator`: `"credit"` or `"debit"`, `asOfDate`).
- `WalletTransaction.status` is one of `"authorized"`, `"pending"`, `"booked"`, `"rejected"` (`memo` transactions are dropped at the FinanceKit boundary and never appear in fixtures).
- `WalletTransaction.transactionType` matches FinanceKit's `TransactionType` cases in camelCase (for example `"pointOfSale"`, `"refund"`, `"deposit"`, `"interest"`, `"unknown"`).
