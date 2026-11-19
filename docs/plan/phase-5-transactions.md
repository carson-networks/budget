# Phase 5: transactions

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 4](phase-4-accounts.md) · Next: [Phase 6](phase-6-after-first-insert.md)

Read the working rules before starting any task here.

**Depends on:** P5-S1 needs P4-S2. The app tasks need P3-A1 and P1-A3 and can be built against fakes; the exit check needs P5-S1 and phase 4. See [Parallel work](README.md#parallel-work).

**Outcome:** **Sync now** in the app puts transactions in budget-server with the right sign, date and name, and syncing again adds nothing. Foreground only; updates, deletes and balances come in phase 6.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P5-S1 | Idempotent insert through `PushChanges` | budget-server | Agent |
| [ ] | P5-A1 | `SyncEngine`, outbox and tokens | budget | Agent |
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

### P5-A1 `SyncEngine`, outbox and tokens

The engine in `Sync`, the outbox in `Storage`, following the "Sync run" steps in the contract.

- `Outbox` actor: versioned (`schemaVersion`) Codable files in the App Group, one per batch, each holding the request and any tokens committed when that batch succeeds. Ordered, survives a kill, capped (oldest-first send; if it exceeds a size limit the engine stops reading new changes until it drains). An undecodable/incompatible outbox file is moved aside (quarantined) and reported in the run log rather than stalling the queue.
- `SyncEngine` actor (conforming to `SyncRunning` in `Domain`) with `run(trigger:)`, built by `Dependencies.live` and given `FinanceDataSource` and `BudgetAPI` through its `init`: acquire `FileLock` (releasing it and flushing the run log in Swift 6.4 `async defer` + `withTaskCancellationShield`), drain the outbox (stopping immediately on `.unauthenticated` or `.unreachable`), `GetStatus`, `ListAccounts`, then per owned account **skip any account that still has undrained outbox entries**; otherwise read changes, map, batch at 500, enqueue with the new history tokens attached **only to the final batch** of the split change set, push (renewing `FileLock` between batches), and commit any attached tokens only after acknowledgement.
- After the server acknowledges a batch, save any tokens attached to that batch and then remove the outbox entry; each file write is atomic. Because intermediate batches carry no token, deleting each acknowledged batch from the outbox prevents resending it on retry while tokens only advance once the full split change set is acknowledged; because `PushChanges` is idempotent, a crash between push, token save and outbox removal replays safely.
- Error handling per the contract: `.unauthenticated` stops the run and marks settings as needing attention; `.notFound` marks that account "Deleted on server" and clears its tokens; `.dataUnavailable` and `.unreachable` end the run quietly as "will retry"; `.invalidToken` clears that account's tokens and restarts it from nothing.
- Cross-process lease-file lock in the App Group (the phase 1 `FileLock`), renewed between batches, with a short stale-lock timeout (~45 s) and no kernel `flock` held across network calls.
- First sync for a newly added account reads from no token, which returns everything the user authorised.

Acceptance, all against the fakes:
- A run against the hand-written fixture produces the expected requests.
- Running twice sends nothing the second time.
- Kill points: after enqueue, after push but before commit, mid-account. Each resumes with no loss and the server-side fake sees only duplicates of what it already had.
- 1,200 transactions become three batches in order; only the third batch carries the new token; a failure on the second deletes only the first from the outbox, leaves the token unadvanced, skips re-reading that account on the next run while its outbox is non-empty, and resumes cleanly from the second batch.
- An undecodable outbox entry is quarantined without blocking remaining accounts.
- Two engines sharing one directory never run at once; a long multi-batch run renews its lease and is not stolen by a second engine.

### P5-A2 Sync now, status and run log

- **Sync now** button on the Accounts tab; pull-to-refresh does the same. A sync also starts when the app becomes active, at most once every five minutes: the app target forwards the scene phase change to a `SyncStatusModel` in `Features` (which depends on `Domain`'s `SyncRunning` and `LogReading` protocols), which applies the throttle and runs the engine.
- Per-account status line: last successful sync time, count of transactions sent in the last run, or the current problem.
- A global banner for states that need the person: key refused, endpoint unreachable for more than a day, Wallet access revoked.
- `RunLog` in `Storage`, in the App Group (versioned `schemaVersion` Codable file, conforming to `LogReading` in `Domain`, wiping and recreating cleanly with a warning if corrupt): one entry per run with trigger, start, duration, per-account counts and outcome; capped at 200 entries. A Run log screen under Settings lists them.
- No merchant names or amounts in the run log.

Acceptance: `SyncStatusModel` tests against in-memory fakes for each status and banner state; `RunLog` tests including corrupt/mismatched `schemaVersion` recovery; the foreground-activation throttle is a pure function in `Domain` with tests; in the Simulator against `make start-local`, **Sync now** puts the fixture's transactions into budget-server and they are visible in the web app.

## Exit check

- On the phone, add one account and tap **Sync now**: the count in the web UI's transaction list matches the app's diagnostics count for that account (excluding rejected), purchases are negative, dates and names are right.
- Sync again: nothing new.
- Change a category in the web UI, sync again: the category is unchanged.
- Force-quit the app mid-sync on a large account, reopen, sync: no duplicates and nothing missing.
