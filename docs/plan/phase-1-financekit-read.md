# Phase 1: FinanceKit read side

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 0](phase-0-setup.md) · Next: [Phase 2](phase-2-phone-test.md)

Read the working rules before starting any task here.

**Depends on:** Phase 0 (P0-A1 to start; P0-H3's TestFlight build for the exit check). Every other task here needs P1-A0. See [Parallel work](README.md#parallel-work).

**Outcome:** the app asks for FinanceKit access, reads accounts, balances and transactions through a protocol, and shows what it read on a diagnostics screen. It can export what it read as redacted fixtures and logs every background wake. Nothing is sent anywhere.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P1-A0 | Split the package into targets | budget | Agent |
| [ ] | P1-A1 | `FinanceDataSource`, models and the fake | budget | Agent |
| [ ] | P1-A2 | FinanceKit implementation and authorization | budget | Agent |
| [ ] | P1-A3 | Diagnostics screen and fixture export | budget | Agent |
| [ ] | P1-A4 | Background delivery wake log | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

This phase exists so phase 2 can answer the device-only questions before any server work is done.

## Tasks

### P1-A0 Split the package into targets

Lays out `OpenPersonalFinanceKit` as the "Package targets" section of [ios/best-practices.md](../../ios/best-practices.md) describes, so every later task has a home for its code. No behaviour changes.

- `Package.swift`: the eight targets and their dependencies; products `Features`, `Live` and `Fakes`; the approachable-concurrency upcoming features on every target and `.defaultIsolation(MainActor.self)` on `Features`. `connect-swift` and `swift-protobuf` are not added until P3-A1.
- `AppVersion` and its test move to `Domain` and `DomainTests`. Every other target starts with only its `Log.swift` logger category, so each one compiles. Other test targets are added with their first test.
- Project, in its own commit: the app links `Features`, `Live` and `Fakes`; the extension links only `Live`. The app target gets default actor isolation `MainActor` and approachable concurrency; the extension gets approachable concurrency only.
- `Makefile`: `test` runs the package's `OpenPersonalFinanceKit-Package` scheme, which covers every test target. `lint` fails on `import FinanceKit` outside `Sources/FinanceKitSource/` and the extension entry point.
- CI needs no change beyond what the Makefile does.

Acceptance: `make format`, `make lint` and `make test` pass and `DomainTests` runs; the app and extension build for the Simulator and a device; a temporary `import FinanceKit` in `Features` fails `make lint` (say so in the PR, then remove it); the app still shows its version.

### P1-A1 `FinanceDataSource`, models and the fake

Types, protocol and errors in `Domain`; the fake and its fixture in `Fakes`. No FinanceKit import in this task.

- Plain `Sendable`, `Codable` value types mirroring what the contract needs: `WalletAccount` (id, display name, institution, kind asset/liability, currency, credit limit), `WalletBalance` (account id, available, booked, each with amount as `Decimal` and credit/debit indicator, as-of), `WalletTransaction` (every field in the contract's mapping table plus `transactionType` and `originalTransactionDescription`), and `ChangeSet<T>` (inserted, updated, deleted ids, opaque new token as `Data`).
- Protocol:
  ```swift
  public protocol FinanceDataSource: Sendable {
    func authorizationStatus() async throws -> WalletAuthorization
    func requestAuthorization() async throws -> WalletAuthorization
    func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount>
    func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance>
    func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction>
  }
  ```
  Each call drains the non-monitoring history sequence and returns one merged change set with the last token.
- `WalletFixture` in `Domain`: the fixture format (accounts and an ordered list of change sets per account), so the app can write it in P1-A3 and `Fakes` can read it.
- `FakeFinanceDataSource` in `Fakes`: loads a `WalletFixture` from its resources and serves the change sets by token. Ships a hand-written fixture in `Sources/Fakes/Fixtures/` with one card, one savings account, a pending charge that later books, a rejected charge and a deleted charge.
- Errors: a typed `FinanceDataError` with `.notAuthorized`, `.dataUnavailable` (device locked) and `.invalidToken`.

Acceptance: unit tests in `FakesTests` for the fake's token progression and for fixture decoding with unknown fields disallowed; the fixture format is documented in a short `README.md` in `Sources/Fakes/Fixtures/`.

### P1-A2 FinanceKit implementation and authorization

- `FinanceKitDataSource` in `FinanceKitSource`: maps `Account`, `AccountBalance`, `Transaction` and `FinanceStore.Changes` to the P1-A1 types; encodes and decodes `HistoryToken` to `Data`.
- Maps "data protected while locked" to `.dataUnavailable` and a rejected token to `.invalidToken`.
- `Dependencies.live(financeData:)` in `Live`. The app's composition root passes `FakeFinanceDataSource` in the Simulator and when a debug launch argument is set, and the FinanceKit source otherwise.
- Onboarding screen, driven by `OnboardingModel` in `Features`: explains what is read, then calls `requestAuthorization()`. Handles denied and restricted with a link to Settings.
- Skips `memo` transactions here, so nothing downstream sees them.

Acceptance: mapping functions are pure and unit-tested with hand-built inputs where FinanceKit types can be constructed, and reviewed by reading where they cannot (say which in the PR); `OnboardingModel` is tested against the fake for granted, denied and restricted; the app builds for a device; in the Simulator the onboarding flow completes against the fake.

### P1-A3 Diagnostics screen and fixture export

- Diagnostics screen (reachable from a Settings tab, kept in release builds), driven by `DiagnosticsModel` in `Features`: authorization status; per account its id, kind, institution, both balances with indicators, credit limit, transaction count by status, and the date range covered.
- A transaction list per account showing id, status, amount, indicator, dates and description, sorted newest first.
- "Read again from saved token" and "Reset tokens" buttons, showing the size of each resulting change set, so the pending → booked lifecycle can be watched.
- "Export fixture": writes what was read as a `WalletFixture` and opens the share sheet. A "Redact" toggle, on by default, replaces descriptions and merchant names with stable placeholders and scales amounts by a random factor chosen per export. Redaction is a pure function in `Domain`, with the random factor passed in.
- Tokens are stored through a small `TokenStore` actor in `Storage`, in the App Group container; this is the store the sync engine uses later.

Acceptance: unit tests for redaction (stable placeholders, no original string survives), for `TokenStore` against a temporary directory, and for `DiagnosticsModel` against the fake; an exported fixture loads back into `FakeFinanceDataSource`.

### P1-A4 Background delivery wake log

- `WakeLog` and the cross-process `FileLock` in `Storage`.
- `WakeProbe` in `Sync`: given a trigger, reads each account's changes since its saved token through `FinanceDataSource` (without saving the token) and appends a line to the wake log: time, trigger, data types, whether the read succeeded, and how many changes it saw. The extension's `didReceiveData(for:)` and `willTerminate()` call it through `Dependencies.live()` and do nothing else.
- `BackgroundDeliveryControl` protocol and `SyncFrequency` (hourly / daily / weekly / off) in `Domain`. `FinanceKitBackgroundDelivery` in `FinanceKitSource` calls `enableBackgroundDelivery(for:frequency:)` for all three data types, or `disableAllBackgroundDelivery()`. `FakeBackgroundDelivery` in `Fakes` records the calls.
- A frequency picker on the Settings tab, driven by a model in `Features`. The chosen frequency is saved in `Storage` and re-applied through `BackgroundDeliveryControl` at launch.
- A `BGAppRefreshTask` registration in the app target whose handler only runs `WakeProbe` with trigger `.backgroundRefresh`, to compare how often each fires.
- The diagnostics screen shows the wake log.

Acceptance: unit tests for the log (append, cap at 500 lines, concurrent writers from two processes via the file lock), for `WakeProbe` against the fake, and for the frequency model against `FakeBackgroundDelivery`; the PR states that real wake behaviour can only be observed in phase 2.

## Exit check

- In the Simulator, the app onboards against the fake and the diagnostics screen shows the fixture's accounts and transactions.
- A TestFlight build on a phone asks for Wallet access and shows real accounts, balances and transactions on the diagnostics screen.
- The frequency picker survives an app restart.
