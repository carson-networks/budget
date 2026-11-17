# Phase 1: FinanceKit read side

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 0](phase-0-setup.md) · Next: [Phase 2](phase-2-phone-test.md)

Read the working rules before starting any task here.

**Depends on:** Phase 0 (P0-A1 to start; P0-H3's TestFlight build for the exit check). See [Parallel work](README.md#parallel-work).

**Outcome:** the app asks for FinanceKit access, reads accounts, balances and transactions through a protocol, and shows what it read on a diagnostics screen. It can export what it read as redacted fixtures and logs every background wake. Nothing is sent anywhere.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P1-A1 | `FinanceDataSource`, models and the fake | budget | Agent |
| [ ] | P1-A2 | FinanceKit implementation and authorization | budget | Agent |
| [ ] | P1-A3 | Diagnostics screen and fixture export | budget | Agent |
| [ ] | P1-A4 | Background delivery wake log | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

This phase exists so phase 2 can answer the device-only questions before any server work is done.

## Tasks

### P1-A1 `FinanceDataSource`, models and the fake

In `OpenPersonalFinanceKit`. No FinanceKit import in this task.

- Plain `Sendable`, `Codable` value types mirroring what the contract needs: `WalletAccount` (id, display name, institution, kind asset/liability, currency, credit limit), `WalletBalance` (account id, available, booked, each with amount as `Decimal` and credit/debit indicator, as-of), `WalletTransaction` (every field in the contract's mapping table plus `transactionType` and `originalTransactionDescription`), and `ChangeSet<T>` (inserted, updated, deleted ids, opaque new token as `Data`).
- Protocol:
  ```swift
  protocol FinanceDataSource: Sendable {
    func authorizationStatus() async throws -> WalletAuthorization
    func requestAuthorization() async throws -> WalletAuthorization
    func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount>
    func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance>
    func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction>
  }
  ```
  Each call drains the non-monitoring history sequence and returns one merged change set with the last token.
- `FakeFinanceDataSource`: loads a JSON fixture describing accounts and an ordered list of change sets per account, and serves them by token. Ships a hand-written fixture with one card, one savings account, a pending charge that later books, a rejected charge and a deleted charge.
- Errors: a typed `FinanceDataError` with `.notAuthorized`, `.dataUnavailable` (device locked) and `.invalidToken`.

Acceptance: unit tests for the fake's token progression and for fixture decoding with unknown fields disallowed; the fixture format is documented at the top of the fixture file's directory in a short `README.md`.

### P1-A2 FinanceKit implementation and authorization

- `FinanceKitDataSource`: the only file that imports FinanceKit. Maps `Account`, `AccountBalance`, `Transaction` and `FinanceStore.Changes` to the P1-A1 types; encodes and decodes `HistoryToken` to `Data`.
- Maps "data protected while locked" to `.dataUnavailable` and a rejected token to `.invalidToken`.
- Selection at start-up: the fake in the Simulator and when a debug launch argument is set, FinanceKit otherwise.
- Onboarding screen: explains what is read, then calls `requestAuthorization()`. Handles denied and restricted with a link to Settings.
- Skips `memo` transactions here, so nothing downstream sees them.

Acceptance: mapping functions are pure and unit-tested with hand-built inputs where FinanceKit types can be constructed, and reviewed by reading where they cannot (say which in the PR); the app builds for a device; in the Simulator the onboarding flow completes against the fake.

### P1-A3 Diagnostics screen and fixture export

- Diagnostics screen (reachable from a Settings tab, kept in release builds): authorization status; per account its id, kind, institution, both balances with indicators, credit limit, transaction count by status, and the date range covered.
- A transaction list per account showing id, status, amount, indicator, dates and description, sorted newest first.
- "Read again from saved token" and "Reset tokens" buttons, showing the size of each resulting change set, so the pending → booked lifecycle can be watched.
- "Export fixture": writes what was read in the P1-A1 fixture format and opens the share sheet. A "Redact" toggle, on by default, replaces descriptions and merchant names with stable placeholders and scales amounts by a random factor chosen per export.
- Tokens are stored through a small `TokenStore` in the App Group container; this is the store the sync engine uses later.

Acceptance: unit tests for redaction (stable placeholders, no original string survives) and for `TokenStore`; an exported fixture loads back into `FakeFinanceDataSource`.

### P1-A4 Background delivery wake log

- The extension's `didReceiveData(for:)` appends a line to a wake log in the App Group: time, data types, whether a FinanceKit read succeeded, and how many changes it saw since the saved token (without saving the token). `willTerminate()` logs too.
- A frequency picker (hourly / daily / weekly / off) on the Settings tab calling `enableBackgroundDelivery(for:frequency:)` for all three data types, or `disableAllBackgroundDelivery()`.
- A `BGAppRefreshTask` registration that only appends to the same log, to compare how often each fires.
- The diagnostics screen shows the wake log.

Acceptance: unit tests for the log (append, cap at 500 lines, concurrent writers from two processes via the file lock); the PR states that real wake behaviour can only be observed in phase 2.

## Exit check

- In the Simulator, the app onboards against the fake and the diagnostics screen shows the fixture's accounts and transactions.
- A TestFlight build on a phone asks for Wallet access and shows real accounts, balances and transactions on the diagnostics screen.
- The frequency picker survives an app restart.
