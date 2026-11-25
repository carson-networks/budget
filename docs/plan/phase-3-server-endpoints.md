# Phase 3: server endpoints, wired to the app

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 2](phase-2-phone-test.md) · Next: [Phase 4](phase-4-accounts.md)

Read the working rules before starting any task here.

**Depends on:** P3-S1 needs only the sync contract and can start before phase 2 finishes, at the risk of an additive correction. P3-A1 needs a release of P3-S1. P3-A2 needs P3-A1. See [Parallel work](README.md#parallel-work).

**Outcome:** budget-server exposes the whole `FinanceKitService` and every new field, and the app has a generated client, an endpoint setting and a connection test that reaches them. Nothing is implemented: every RPC returns "unimplemented" and the new fields stay empty.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P3-S1 | `FinanceKitService` and new fields, unimplemented | budget-server | Agent |
| [ ] | P3-A1 | Generated Swift client and `BudgetAPI` | budget | Agent |
| [ ] | P3-A2 | Endpoint and key settings, connection test | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

Later phases, including phase 10, implement behind these definitions; they should not need a proto change.

## RPCs

| RPC | Implemented in |
|---|---|
| `FinanceKitService.GetStatus` | Phase 4 |
| `FinanceKitService.ListAccounts` | Phase 4 |
| `FinanceKitService.LinkAccount` | Phase 4 |
| `FinanceKitService.UnlinkAccount` | Phase 4 |
| `FinanceKitService.PushChanges` | Phase 5 (inserts), phase 6 (everything else) |
| `FinanceKitService.RegisterPushToken` | Phase 10 |

## Tasks

### P3-S1 `FinanceKitService` and new fields, unimplemented

Proto and wiring only: no migration, no storage change, no behaviour change for existing RPCs.

- New `proto/financekit/v1/financekit.proto`, exactly as in the [sync contract](sync-contract.md) after its phase 2 corrections.
- The `AccountIntegration` enum and the `integration`, `last_synced_at` and `credit_limit` fields on `Account`; `pending` on `Transaction`. All as in the contract.
- `make proto-generate`.
- Handler package `internal/connecthandlers/v1/financekit/`, registered in `api/connect.go`. Every method returns `connect.CodeUnimplemented`.
- The new fields are left at their zero values. Do not populate them yet.

Acceptance:
- The Buf workflow's lint and breaking-change checks pass (the changes are additive).
- A test calls each of the six RPCs and gets `Unimplemented`.
- All existing tests pass untouched; `make start-local` in budget-stack boots and the web app behaves as before.

### P3-A1 Generated Swift client and `BudgetAPI`

Needs a budget-server release containing P3-S1.

- `ios/buf.gen.yaml` generating Swift messages (`swift-protobuf`) and Connect clients (`connect-swift`) for `financekit.v1` and `account.v1` from the budget-server repo at that release tag, into `ios/OpenPersonalFinanceKit/Sources/BudgetClient/Gen/`, with `Visibility=Internal` on both plugins. `make -C ios proto-generate`; commit the output. CI verifies it is up to date, as weather-client's `proto` job does.
- Add `connect-swift` and `swift-protobuf` to the package, versions pinned, as dependencies of `BudgetClient` only.
- In `Domain`: the `BudgetAPI` protocol with `getStatus` only, returning `ServerStatus` (a plain value named for what it means, not a copy of `GetStatusResponse`). Each later task adds the method it first calls: `listAccounts`, `linkAccount` and `unlinkAccount` in P4-A1, `pushChanges` in P5-A1, `registerPushToken` in P10-A1. The generated client covers every RPC from the start.
- In `BudgetClient`: `ConnectBudgetAPI` implements it, converting generated messages to and from those values (every wire detail stays here): base URL and key supplied per call from settings, `Authorization: Bearer` header, JSON encoding to match the web, a request timeout.
- A typed `BudgetAPIError` in `Domain` with the cases P3-A2's connection test shows: `.unauthenticated`, `.unimplemented`, `.unreachable`, `.other`. Connect codes are mapped to it inside `BudgetClient`; later tasks add `.failedPrecondition` (P4-A1), `.notFound` and `.invalidArgument` (P5-A1).
- `FakeBudgetAPI` in `Fakes`.

Acceptance: `BudgetClientTests` checks the `GetStatus` request body against captured JSON, and an in-process stub confirms the bearer header is sent and each Connect code maps to the right error; nothing outside `BudgetClient` imports Connect or SwiftProtobuf (`no-network-import`), no generated type is `public`, and no `Domain` value mirrors a generated message.

### P3-A2 Endpoint and key settings, connection test

- `SettingsStore` in `Storage` (conforming to `SettingsStoring` in `Domain`, backed by an in-memory fake in `Fakes` for `SyncTests`): endpoint URL and API key in the Keychain, shared with the extension by passing the App Group ID (`group.net.carsonnetworks.OpenPersonalFinance`) as `kSecAttrAccessGroup` (no extra `keychain-access-groups` entitlement or Team ID prefix needed), with `kSecAttrAccessibleAfterFirstUnlock` so background runs can read them while the phone is locked (intentionally not `ThisDeviceOnly` so encrypted device backups and phone upgrades carry the key across). The key is never written to `UserDefaults`, logs or the run log.
- `ServerConnecting` in `Domain`, implemented by `ServerConnection` in `Sync`: reads and saves the endpoint and key through `SettingsStoring`, and runs **Test Connection** through `BudgetAPI`. `FakeServerConnection` in `Fakes`.
- Settings screen, driven by `SettingsModel` in `Features`, which depends on `ServerConnecting` and never sees `SettingsStoring`: endpoint URL field, API key field (secure entry, paste supported), **Test Connection**, and a clear indication of the last result.
- URL validation as a pure function in `Domain`: must parse, must be `https` (or `http://localhost` in debug builds), trailing slash normalised, a missing `/api` suffix is not added silently but hinted at.
- **Test Connection** calls `GetStatus`. For this phase, `Unimplemented` is shown as "Reached budget-server (not yet enabled)"; `.unreachable` shows the underlying reason (DNS, TLS, timeout).
- First-run flow: endpoint and key, then the phase 1 authorization screen.
- `Dependencies.live` gains the settings store, `ConnectBudgetAPI` and `ServerConnection`; the Simulator still uses the fake finance data source with the real API.

Acceptance: unit tests for URL validation, for `ServerConnection` against `FakeBudgetAPI` and the in-memory settings store across every error case, and for `SettingsModel` against `FakeServerConnection`; in the Simulator against `make start-local`, **Test Connection** reaches the stack at `http://localhost:8080/api`.

## Exit check

- Calling any `FinanceKitService` RPC on budget-server returns `Unimplemented`.
- A TestFlight build on the phone, pointed at the production URL, reports that it reached budget-server.
- A wrong hostname and a plain `http` URL each give a clear message.
- The web app and Plaid sync behave exactly as before.
