# Phase 3: server endpoints, wired to the app

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 2](phase-2-phone-test.md) · Next: [Phase 4](phase-4-accounts.md)

Read the working rules before starting any task here.

**Depends on:** P3-S1 needs only the sync contract and can start before phase 2 finishes, at the risk of an additive correction. P3-A1 needs a release of P3-S1 and P1-A1. P3-A2 needs P3-A1. See [Parallel work](README.md#parallel-work).

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

- `ios/buf.gen.yaml` generating Swift messages (`swift-protobuf`) and Connect clients (`connect-swift`) for `financekit.v1` and `account.v1` from the budget-server repo at that release tag, into `ios/OpenPersonalFinanceKit/Sources/OpenPersonalFinanceKit/Gen/`. `make -C ios proto-generate`; commit the output. CI verifies it is up to date, as weather-client's `proto` job does.
- Add `connect-swift` and `swift-protobuf` to the package, versions pinned.
- `BudgetAPI` protocol with one async method per RPC (all but `RegisterPushToken`, which phase 10 adds), taking and returning the package's own value types, not generated messages. `ConnectBudgetAPI` implements it: base URL and key supplied per call from settings, `Authorization: Bearer` header, JSON encoding to match the web, a request timeout.
- A typed `BudgetAPIError`: `.unauthenticated`, `.notFound`, `.failedPrecondition`, `.invalidArgument`, `.unimplemented`, `.unreachable`, `.other`.
- `FakeBudgetAPI` for tests.
- Pure mapping functions from the P1-A1 wallet types to request values, following the contract's mapping table: sign, name fallback, status, decimal strings.

Acceptance: unit tests for every mapping row in the contract, including the P2 fixtures; a test with an in-process stub confirms the bearer header is sent and each Connect code maps to the right error; no file outside `ConnectBudgetAPI` and `Gen/` imports generated code.

### P3-A2 Endpoint and key settings, connection test

- `SettingsStore`: endpoint URL and API key in the Keychain, in an access group shared with the extension. The key is never written to `UserDefaults`, logs or the run log.
- Settings screen: endpoint URL field, API key field (secure entry, paste supported), **Test connection**, and a clear indication of the last result.
- URL validation as a pure function: must parse, must be `https` (or `http://localhost` in debug builds), trailing slash normalised, a missing `/api` suffix is not added silently but hinted at.
- **Test connection** calls `GetStatus`. For this phase, `Unimplemented` is shown as "Reached budget-server (not yet enabled)"; `.unreachable` shows the underlying reason (DNS, TLS, timeout).
- First-run flow: endpoint and key, then the phase 1 authorization screen.

Acceptance: unit tests for URL validation and for the connection-test view model across every error case; in the Simulator against `make start-local`, **Test connection** reaches the stack at `http://localhost:8080/api`.

## Exit check

- Calling any `FinanceKitService` RPC on budget-server returns `Unimplemented`.
- A TestFlight build on the phone, pointed at the production URL, reports that it reached budget-server.
- A wrong hostname and a plain `http` URL each give a clear message.
- The web app and Plaid sync behave exactly as before.
