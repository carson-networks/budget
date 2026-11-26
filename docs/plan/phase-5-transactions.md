# Phase 5: transactions

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 4](phase-4-accounts.md) · Next: [Phase 6](phase-6-after-first-insert.md)

Read the working rules before starting any task here.

**Depends on:** P5-S1 needs P4-S2. The app tasks need P3-A1 and P1-A3 and can be built against fakes; the exit check needs P5-S1 and phase 4. See [Parallel work](README.md#parallel-work).

**Outcome:** **Sync Now** in the app puts transactions in budget-server with the right sign, date and name, and syncing again adds nothing. Foreground only; updates, deletes and balances come in phase 6.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P5-S1 | Idempotent insert through `PushChanges` | budget-server | Agent |
| [ ] | P5-A1 | `SyncEngine` and chunked token commits | budget | Agent |
| [ ] | P5-A2 | Sync now, status and run log | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

## Tasks

### P5-S1 Idempotent insert through `PushChanges`

- Migration: `financekit_transaction_links` from the contract. Storage in `internal/storage/financekit/`.
- Action `financekit_add_transactions.go`: for one account, inserts each transaction whose FinanceKit ID has no link, with its link row, and reports inserted and unchanged counts. Mapping per the contract: sign from `is_credit`, name fallback, merchant, date, `needs_review = true`, no category.
- Implement `PushChanges` for inserts, replacing its `Unimplemented` response:
  - Resolves the account from `financekit_account_id`; `NotFound` if unlinked; `FailedPrecondition` if the caller is not the owner.
  - An ID that already has a link is counted as `unchanged` and left alone in this phase.
  - `deleted_transaction_ids`, `balance`, `credit_limit`, `full_resync`, `resync_complete` and the `pending` and `rejected` statuses are accepted and ignored until phase 6; a `rejected` item is skipped.
  - More than 500 transactions → `InvalidArgument`. The whole batch is one database transaction.

Acceptance: tests for a repeated batch (second call: all `unchanged`, no row changed), a mixed batch, ownership and scoping (unlinked, other key's account), sign for both indicators, and a 500-item batch finishing well inside the 30 s write timeout.

### P5-A1 `SyncEngine` and chunked token commits

The engine in `Sync`, following the "Sync run" steps in the contract (no local outbox: `FinanceStore` retains unsent changes behind each account's saved tokens).

- `FinanceDataSource` gains chunk-by-chunk transaction history streaming (`transactionChangeChunks(accountID:since:)`) so `SyncEngine` processes one `FinanceStore.Changes` chunk at a time (keeping one lookahead chunk in memory to identify the final chunk without draining full account history into memory). `FakeFinanceDataSource` yields its fixture steps one chunk at a time.
- `SyncEngine` actor (conforming to `SyncRunning` in `Domain`) with `run(trigger:)`, built by `Dependencies.live` and given `FinanceDataSource` and `BudgetAPI` through its `init`: acquire `FileLock` (releasing it and flushing the run log in Swift 6.4 `async defer` + `withTaskCancellationShield`), `GetStatus` (stopping immediately on `.unauthenticated` or `.unreachable`), `ListAccounts`, then per owned account stream transaction chunks since its saved `transactionToken`, map, split any >500-item chunk into batches of at most 500, call `PushChanges` per batch (renewing `FileLock` between batches), and save that chunk's `newToken` only after **all** sub-batches of that chunk are acknowledged.
- Because a chunk's `transactionToken` advances only once every sub-batch of that chunk succeeds, a crash or failure mid-chunk leaves the token at the previous chunk boundary; on the next run `FinanceStore` yields the chunk again and any already-pushed sub-batches replay safely as `unchanged` via `PushChanges` idempotency. Meanwhile, completed earlier chunks are never re-read or re-sent.
- Error handling per the contract: `.unauthenticated` stops the run and marks settings as needing attention; `.notFound` marks that account "Deleted on Server" and clears its tokens; `.dataUnavailable` and `.unreachable` end the run quietly as "will retry" without advancing unsent tokens; `.invalidToken` clears that account's tokens and restarts it from nothing.
- Cross-process lease-file lock in the App Group (the phase 1 `FileLock`), which gains `renew()` here to extend the lease between batches, keeping the short stale-lock timeout (~45 s) and no kernel `flock` held across network calls.
- `BudgetAPI`, `ConnectBudgetAPI` and `FakeBudgetAPI` gain `pushChanges`, and `BudgetAPIError` gains `.notFound` and `.invalidArgument`. `pushChanges` takes a `ChangeBatch` (a `Domain` value, converted to `PushChangesRequest` only in `BudgetClient`) carrying what this phase sends: transactions and deleted IDs.
- Pure mapping functions in `Domain` from `WalletTransaction` to `ChangeBatch` items, following the contract's mapping table: sign, name fallback, status. Decimal strings, proto enums and field names are written by `BudgetClient`.
- First sync for a newly added account reads from no token, which returns everything the user authorised.

Acceptance, all against the fakes:
- `DomainTests` for every transaction mapping row in the contract, including the P2 fixtures; `BudgetClientTests` checks the `PushChanges` request body against captured JSON.
- `FileLock` lease renewal keeps a lock past its original expiry; a lease that is not renewed expires.
- A run against the hand-written fixture produces the expected requests.
- Running twice sends nothing the second time.
- Multi-chunk progression: when chunk 1 succeeds and chunk 2 fails, chunk 1's token is saved so the next run starts directly at chunk 2 without resending chunk 1.
- Single 1,200-transaction chunk split into three batches of <=500: the token advances only after the third batch succeeds; a failure on the second batch leaves the token unadvanced, and the next run replays batch 1 idempotently (`unchanged` on the server fake) and completes batches 2 and 3 with no duplicates or missing items.
- Offline `GetStatus` or mid-account failure leaves unsent tokens untouched and recovers cleanly on the next run.
- Two engines sharing one directory never run at once; a long multi-batch run renews its lease and is not stolen by a second engine.

### P5-A2 Sync now, status and run log

- **Sync Now** button on the Accounts tab; pull-to-refresh does the same. A sync also starts when the app becomes active, at most once every five minutes: the app target forwards the scene phase change to a `SyncStatusModel` in `Features` (which depends on `Domain`'s `SyncRunning` and `ActivityReading` protocols, never on the run log store), which applies the throttle and runs the engine.
- Per-account status line: last successful sync time, count of transactions sent in the last run, or the current problem.
- A global banner for states that need the person: key refused, endpoint unreachable for more than a day, Wallet access revoked.
- `RunLog` in `Storage`, in the App Group (versioned `schemaVersion` file in its own private shape, conforming to `LogStoring` in `Domain`, wiping and recreating cleanly with a warning if corrupt), read by screens only through `ActivityReading`, which gains recent runs: one entry per run with trigger, start, duration, per-account counts and outcome; capped at 200 entries. A Run Log screen under Settings lists them.
- No merchant names or amounts in the run log.

Acceptance: `SyncStatusModel` tests against in-memory fakes for each status and banner state; `RunLog` tests including corrupt/mismatched `schemaVersion` recovery; the foreground-activation throttle is a pure function in `Domain` with tests; in the Simulator against `make start-local`, **Sync Now** puts the fixture's transactions into budget-server and they are visible in the web app.

## Exit check

- On the phone, add one account and tap **Sync Now**: the count in the web UI's transaction list matches the app's diagnostics count for that account (excluding rejected), purchases are negative, dates and names are right.
- Sync again: nothing new.
- Change a category in the web UI, sync again: the category is unchanged.
- Force-quit the app mid-sync on a large account, reopen, sync: no duplicates and nothing missing.
