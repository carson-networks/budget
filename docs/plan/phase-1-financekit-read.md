# Phase 1: FinanceKit read side

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 0](phase-0-setup.md) · Next: [Phase 2](phase-2-phone-test.md)

Read the working rules before starting any task here.

**Depends on:** Phase 0 (P0-A1 to start; P0-H3's TestFlight build for the exit check). Every other task here needs P1-A0. See [Parallel work](README.md#parallel-work).

**Outcome:** the app asks for FinanceKit access, reads accounts, balances and transactions through a protocol, and shows what it read on a diagnostics screen. It can export what it read as redacted fixtures and logs every background wake. Nothing is sent anywhere.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [x] | P1-A0 | Split the package into targets | budget | Agent |
| [x] | P1-A1 | Wallet authorization and onboarding | budget | Agent |
| [x] | P1-A2 | Read Wallet data and show it | budget | Agent |
| [x] | P1-A3 | Saved tokens and fixture export | budget | Agent |
| [x] | P1-A4 | Background delivery wake log | budget | Agent |
| [x] | — | Exit check passed | — | Human |

This phase exists so phase 2 can answer the device-only questions before any server work is done.

## Tasks

### P1-A0 Split the package into targets

Lays out `OpenPersonalFinanceKit` as the "Package targets" section of [ios/best-practices.md](../../ios/best-practices.md) describes, so every later task has a home for its code. No behaviour changes.

- `Package.swift`: bump to `// swift-tools-version: 6.4`; the eight targets and their dependencies (`Features` depends on `Domain` only); products `Features`, `Live` and `Fakes`; the `NonisolatedNonsendingByDefault`, `InferIsolatedConformances` and `MemberImportVisibility` upcoming features on every target (matching the Xcode targets), and `.defaultIsolation(MainActor.self)` on `Features`. `connect-swift` and `swift-protobuf` are not added until P3-A1.
- `AppVersion` and its test move to `Domain` and `DomainTests`. Every other target starts with only its `Log.swift` logger category, so each one compiles. Other test targets are added with their first test.
- Project, in its own commit: the app links `Features`, `Live` and `Fakes`; the extension links only `Live`. The app target gets default actor isolation `MainActor` and approachable concurrency; the extension explicitly sets `SWIFT_DEFAULT_ACTOR_ISOLATION = nonisolated` alongside approachable concurrency.
- `Makefile`: `test` runs the package's `OpenPersonalFinanceKit-Package` scheme, which covers every test target. `lint` fails on `import FinanceKit` outside `Sources/FinanceKitSource/` and the extension entry point.
- CI needs no change beyond what the Makefile does.

Acceptance: `make format`, `make lint` and `make test` pass and `DomainTests` runs; the app and extension build for the Simulator and a device; a temporary `import FinanceKit` in `Features` fails `make lint` (say so in the PR, then remove it); the app still shows its version.

### P1-A1 Wallet authorization and onboarding

The first slice of `FinanceDataSource`: availability and authorization, from the protocol through FinanceKit to a screen. No FinanceKit history reading yet.

- In `Domain`:
  ```swift
  public protocol FinanceDataSource: Sendable {
    func isDataAvailable() -> Bool
    func authorizationStatus() async throws -> WalletAuthorization
    func requestAuthorization() async throws -> WalletAuthorization
  }
  ```
  `WalletAuthorization` mirrors FinanceKit's `AuthorizationStatus` (`notDetermined`, `authorized`, `denied`). `FinanceDataError` starts with `.dataUnavailable` (data protected while locked).
- `FinanceKitDataSource` in `FinanceKitSource`: `isDataAvailable()` via `FinanceStore.isDataAvailable(.financialData)`, the two authorization calls, and the status and error mapping as pure functions.
- `FakeFinanceDataSource` in `Fakes`: configurable availability, starting status, the answer to a request, and an injected error.
- `Dependencies.live(financeData:)` in `Live`. The app's composition root passes `FakeFinanceDataSource` only under `#if DEBUG || targetEnvironment(simulator)` (always in the Simulator, or when a debug launch argument is set), and `FinanceKitDataSource` otherwise so Release device builds never run against fakes.
- Onboarding screen, driven by `OnboardingModel` in `Features`: checks `isDataAvailable()` first (showing a clear explanation if FinanceKit is unavailable in the user's region or on the device), explains what is read, then calls `requestAuthorization()`. Handles unavailable and denied (with a link to Settings). Once access is granted the app shows its version screen until P1-A2 replaces it.

Acceptance: parameterized tests for the status and error mapping in `FinanceKitSourceTests`; `OnboardingModel` tested against the fake for unavailable, granted, denied and a failed check; the app builds for a device; in the Simulator the onboarding flow completes against the fake.

### P1-A2 Read Wallet data and show it

Adds FinanceKit history reading and its first caller, a read-only diagnostics screen.

- `FinanceDataSource` gains:
  ```swift
  func accountChanges(since token: Data?) async throws -> ChangeSet<WalletAccount>
  func balanceChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletBalance>
  func transactionChanges(accountID: UUID, since token: Data?) async throws -> ChangeSet<WalletTransaction>
  ```
- In `Domain`: plain `Sendable` value types mirroring what the contract needs: `WalletAccount` (id, display name, institution, kind asset/liability, currency, credit limit), `WalletBalance` (account id, available, booked, each with amount as `Decimal` and credit/debit indicator, as-of), `WalletTransaction` (every field in the contract's mapping table plus `transactionType` and `originalTransactionDescription`), and `ChangeSet<T>` (inserted, updated, deleted ids, opaque new token as `Data`) with a pure `ChangeSet.merging(_ chunks:)` that coalesces chronologically by ID (a later update supersedes an earlier insert/update; a later delete removes any earlier insert/update and records the deletion, keeping the last chunk's token). `FinanceDataError` gains `.notAuthorized` and `.invalidToken`.
- `FinanceKitDataSource`: each history call drains the non-monitoring sequence into per-chunk `ChangeSet`s and merges them. It maps `Account`, `AccountBalance`, `Transaction` and `FinanceStore.Changes` to the wallet types, encodes and decodes `HistoryToken` as `Data`, maps a rejected token to `.invalidToken`, and skips `memo` transactions so nothing downstream sees them.
- `WalletFixture` in `Domain`, decoded with unknown keys rejected (`JSONDecoder` ignores them by default, so validate keys explicitly): accounts, and one set of balances and transactions per account. `FakeFinanceDataSource` serves it. Ships a hand-written fixture in `Sources/Fakes/Fixtures/` with one card and one savings account, documented in a short `README.md` beside it.
- Diagnostics screen (reachable from a Settings tab, kept in release builds), driven by `DiagnosticsModel` in `Features`, reading everything from no token: authorization status; per account its id, kind, institution, both balances with indicators, credit limit, transaction count by status, and the date range covered; a transaction list per account showing id, status, amount, indicator, dates and description, newest first. Apply `.privacySensitive()` to balances, credit limits and transaction rows.

Acceptance: `DomainTests` for `ChangeSet.merging` (insert → update, insert → delete, update → delete, empty chunks); mapping functions are pure and unit-tested with hand-built inputs where FinanceKit types can be constructed, and reviewed by reading where they cannot (say which in the PR); `FakesTests` for fixture decoding with unknown fields disallowed; `DiagnosticsModel` tested against the fake; in the Simulator the diagnostics screen shows the fixture's accounts and transactions.

### P1-A3 Saved tokens and fixture export

Adds what makes the pending → booked lifecycle observable and lets phase 2 capture real data.

- Tokens are stored through a `TokenStore` actor in `Storage` (conforming to `TokenStoring` in `Domain`, backed by `InMemoryTokenStore` in `Fakes` for `SyncTests`), backed by `StorageDatabase` (`GRDB.swift` SQLite in the App Group container with `PRAGMA journal_mode = DELETE`, `completeUntilFirstUserAuthentication` file protection and best-effort `performExpiringActivity` write guards) storing per-account `(accountToken, balanceToken, transactionToken)` rows in its own private row shape; `AccountTokens` is not `Codable`. A corrupt SQLite file is removed and recreated cleanly with a warning; an unreadable path throws rather than being overwritten. This is the store the sync engine uses later.
- `WalletHistoryReading` in `Domain`, implemented by `WalletHistoryReader` in `Sync` over `FinanceDataSource` and `TokenStoring`: read everything (saving starting tokens for accounts that have none), read one account since its saved tokens (saving the new ones), and reset. It returns `WalletChanges` (what a read moved past, without tokens). `DiagnosticsModel` uses it and never sees `TokenStoring`; `FakeWalletHistoryReader` in `Fakes` serves a fixture to `FeaturesTests` and previews.
- "Read Again from Saved Token" and "Reset Tokens" buttons on the diagnostics screen, showing the size of each resulting change set.
- The fixture file is read by `FixtureFileReader` in `Storage/FixtureFile/` (used by `Fakes`) and written by the diagnostics export, each through its own plain `Codable` structs mapped to or from the wallet types (which are not `Codable`); a test loads an export back through the reader; unknown keys are found by re-encoding what was decoded and comparing keys. It gains an ordered list of change steps for accounts and for each account's balances and transactions, and a `schemaVersion`. `FakeFinanceDataSource` serves one step per token and rejects corrupt or cross-stream tokens with `.invalidToken`. The hand-written fixture gains a pending charge that later books, a rejected charge and a deleted charge.
- "Export Fixture": writes what was read as a `WalletFixture` and opens the share sheet. A "Redact" toggle, on by default, replaces descriptions and merchant names with stable placeholders and scales amounts by a random factor chosen per export. Redaction is a pure function in `Domain`, with the random factor passed in.

Acceptance: unit tests for the fake's token progression, for redaction (stable placeholders, no original string survives), for fixture JSON round trips, for `TokenStore` against a temporary directory (including concurrent per-account writes across two instances and corrupt database recovery), for `WalletHistoryReader` in `SyncTests` against `FakeFinanceDataSource` and `InMemoryTokenStore`, and for `DiagnosticsModel`'s new actions against `FakeWalletHistoryReader`; an exported fixture loads back into the fakes.

### P1-A4 Background delivery wake log

- `WakeLog` and `ScheduleStore` in `Storage`, backed by tables in `StorageDatabase` (`wake_log` and single-row `schedule` migrations). `WakeLog` conforms to `LogStoring` in `Domain`, inserts and trims to the 500 newest rows in one synchronous SQLite transaction (so concurrent app/extension appends serialise through SQLite's busy timeout without `.lock` files or `Task.sleep` retry loops), and skips malformed rows with a warning rather than failing the whole log.
- `WakeProbe` in `Sync`: given a trigger, reads each account's changes since its saved token through `FinanceDataSource` (without saving the token) and appends a line to the wake log (flushed in `async defer` + `withTaskCancellationShield`): time, trigger, data types, whether the read succeeded, and how many changes it saw. The extension's `didReceiveData(for:)` tracks active task(s) via a `Mutex` or actor (coalescing/serializing overlapping wakes so a second wake never overwrites an in-flight handle) and `willTerminate()` cancels active work **and awaits its graceful completion** (bounded by a short grace timeout) before returning; its body calls `Dependencies.live()` and nothing else.
- `BackgroundDeliveryControl` protocol and `SyncFrequency` (hourly / daily / weekly / off) in `Domain`. `FinanceKitBackgroundDelivery` in `FinanceKitSource` calls `enableBackgroundDelivery(for:frequency:)` for all three data types, or `disableAllBackgroundDelivery()`. `FakeBackgroundDelivery` in `Fakes` records the calls.
- A frequency picker on the Settings tab, driven by a model in `Features` that depends only on `SyncScheduling` in `Domain`. `SyncSchedule` in `Sync` implements it: it saves the choice through `ScheduleStoring` (implemented by `Storage`), applies it through `BackgroundDeliveryControl`, and re-applies it at launch.
- A `BGAppRefreshTask` handled via SwiftUI's `.backgroundTask(.appRefresh(...))` scene modifier (scheduled with `BGTaskScheduler.shared.submitTaskRequest(_:)`) whose handler only runs `WakeProbe` with trigger `.backgroundRefresh`, to compare how often each fires. In its own project commit, add the `fetch` background mode (`UIBackgroundModes`) and `BGTaskSchedulerPermittedIdentifiers` to the app target.
- The diagnostics screen shows the wake log through `ActivityReading` in `Domain`, implemented in `Sync` over `LogStoring`; `DiagnosticsModel` never sees the log store.

Acceptance: unit tests for `WakeLog` (append, cap at 500 entries, concurrent appends across two `StorageDatabase` instances, malformed row recovery) and `ScheduleStore` (default and persisted frequency), `WakeProbe` against the fake, `SyncSchedule` against `FakeBackgroundDelivery` and an in-memory schedule store, and the frequency model against a fake `SyncScheduling`; the PR states that real wake behaviour can only be observed in phase 2.

## Exit check

- In the Simulator, the app onboards against the fake and the diagnostics screen shows the fixture's accounts and transactions.
- A TestFlight build on a phone asks for Wallet access and shows real accounts, balances and transactions on the diagnostics screen.
- The frequency picker survives an app restart.
