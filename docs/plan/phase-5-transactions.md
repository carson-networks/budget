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

In `OpenPersonalFinanceKit`, following the "Sync run" steps in the contract.

- `Outbox`: Codable files in the App Group, one per batch, each holding the request and the tokens it covers. Ordered, survives a kill, capped (oldest-first send; if it exceeds a size limit the engine stops reading new changes until it drains).
- `SyncEngine` actor with `run(trigger:)`: lock, drain the outbox, `GetStatus`, `ListAccounts`, then per owned account read changes, map, batch at 500, enqueue, push, and commit tokens only after the acknowledgement.
- A token is saved only together with the removal of the outbox entry it belongs to; a crash between the push and the commit replays the batch, which the server treats as unchanged.
- Error handling per the contract: `.unauthenticated` stops the run and marks settings as needing attention; `.notFound` marks that account "Deleted on server" and clears its tokens; `.dataUnavailable` and `.unreachable` end the run quietly as "will retry"; `.invalidToken` clears that account's tokens and restarts it from nothing.
- Cross-process file lock in the App Group (the phase 1 lock), with a stale-lock timeout.
- First sync for a newly added account reads from no token, which returns everything the user authorised.

Acceptance, all against the fakes:
- A run against the hand-written fixture produces the expected requests.
- Running twice sends nothing the second time.
- Kill points: after enqueue, after push but before commit, mid-account. Each resumes with no loss and the server-side fake sees only duplicates of what it already had.
- 1,200 transactions become three batches in order; a failure on the second keeps the first's token progress.
- Two engines sharing one directory never run at once.

### P5-A2 Sync now, status and run log

- **Sync now** button on the Accounts tab; pull-to-refresh does the same. A sync also starts when the app becomes active, at most once every five minutes.
- Per-account status line: last successful sync time, count of transactions sent in the last run, or the current problem.
- A global banner for states that need the person: key refused, endpoint unreachable for more than a day, Wallet access revoked.
- `RunLog` in the App Group: one entry per run with trigger, start, duration, per-account counts and outcome; capped at 200 entries. A Run log screen under Settings lists them.
- No merchant names or amounts in the run log.

Acceptance: view-model tests for each status and banner state; the foreground-activation throttle is a pure function with tests; in the Simulator against `make start-local`, **Sync now** puts the fixture's transactions into budget-server and they are visible in the web app.

## Exit check

- On the phone, add one account and tap **Sync now**: the count in the web UI's transaction list matches the app's diagnostics count for that account (excluding rejected), purchases are negative, dates and names are right.
- Sync again: nothing new.
- Change a category in the web UI, sync again: the category is unchanged.
- Force-quit the app mid-sync on a large account, reopen, sync: no duplicates and nothing missing.
