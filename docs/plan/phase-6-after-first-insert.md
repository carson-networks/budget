# Phase 6: after the first insert

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 5](phase-5-transactions.md) · Next: [Phase 7](phase-7-background-sync.md)

Read the working rules before starting any task here.

**Depends on:** Server tasks need P5-S1. P6-A1 needs P5-A1; the exit check needs both. See [Parallel work](README.md#parallel-work).

**Outcome:** the data stays correct as things change. A pending charge takes its final amount when it settles, rejected and deleted charges are removed, balances and credit limits match Wallet, a full resync repairs drift, and budget-server records when each account last synced.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P6-S1 | Pending, updates, deletes | budget-server | Agent |
| [ ] | P6-S2 | Balance, credit limit, last-synced, full resync | budget-server | Agent |
| [ ] | P6-A1 | Send balances and credit limit; full resync | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

The pending flag, credit limit and last-synced time are stored and returned by the API in this phase; they become visible in the web UI in phase 8. Check them here through the API or the database. The app already sends updates and deletes from phase 5; the server ignored them until now.

## Tasks

### P6-S1 Pending, updates, deletes

- Migration: `ALTER TABLE transactions ADD COLUMN pending BOOLEAN NOT NULL DEFAULT FALSE;`
- Carry `pending` through the transaction model, insert, update and list, and populate `Transaction.pending` (field defined in phase 3).
- `PushChanges`, replacing the phase 5 "ignored" behaviour:
  - Insert sets `pending` from the status.
  - An upsert whose ID already has a link updates amount, name, merchant, date and `pending` when any differ, and counts as `updated`; otherwise `unchanged`. Category and `needs_review` are never touched by an update.
  - A `rejected` status, or an ID in `deleted_transaction_ids`, deletes the transaction and its link and counts as `deleted`. Deleting an ID with no link is not an error.
- Actions with tests: `financekit_update_transaction.go`, `financekit_remove_transaction.go`.

Acceptance: migration applies and rolls back; tests for pending → booked with an amount change, a no-op update, category and review flag preserved across an update, rejected on first sight (never inserted), rejected after insert, delete of an unknown ID; existing Plaid and manual behaviour unchanged (all existing tests pass untouched).

### P6-S2 Balance, credit limit, last-synced, full resync

- Migration: `accounts.credit_limit` and `syncs.last_synced_at` from the contract.
- `PushChanges`:
  - `balance` → `accounts.balance`, through action `financekit_set_account_balance.go`. Ignored if `as_of` is older than the last balance applied for that account.
  - `credit_limit` → `accounts.credit_limit`; refused with `InvalidArgument` on a cash account.
  - Every successful call sets `syncs.last_synced_at`, including one that changed nothing.
  - `full_resync` and `resync_complete`, as the contract's "Sync run" section describes: stamp `resync_started_at` on the first flagged batch, stamp `seen_at` on every upsert, and on completion delete that account's linked transactions not seen since the resync started.
- Populate `Account.credit_limit` and `Account.last_synced_at` in `AccountService.ListAccounts` and in `FinanceKitService.ListAccounts`.

Acceptance: tests for balance applied and stale balance ignored, credit limit on card and refused on cash, `last_synced_at` advancing on an empty push, a three-batch full resync removing an orphan and keeping categories on transactions that survive, an abandoned resync deleting nothing; migration applies and rolls back.

### P6-A1 Send balances and credit limit; full resync

- `SyncEngine` reads `balanceChanges` and `accountChanges` per account and attaches the latest balance and credit limit to the final batch of the run for that account. Balance field and sign follow the phase 2 results in the contract.
- Balance and account tokens are committed with that batch, like transaction tokens.
- **Full resync** per account, under the account's detail screen behind a confirmation: clears that account's tokens, reads everything, sends it marked as a resync, and marks the last batch complete.
- An automatic full resync when FinanceKit rejects a saved token.
- Account detail screen: balance, credit limit, last sync, counts, **Sync now**, **Full resync**, **Stop syncing**.

Acceptance: engine tests for balance-only changes (no transactions) still producing a push, credit limit sent only for liability accounts, a multi-batch resync marking only the last batch, and token invalidation triggering a resync; in the Simulator against `make start-local`, the fixture's pending → booked, rejected and deleted cases end in the right server state.

## Exit check

- A new purchase is stored with `pending` true; after it settles the same transaction has its final amount and `pending` false.
- Balances for each account in the web UI match the Wallet app.
- The Apple Card's credit limit is stored (check through the API).
- `last_synced_at` advances after a sync.
- Delete a FinanceKit transaction's row by hand in the database, run **Full resync**: it comes back. Insert a stray linked row: it is removed.
- If a rejected charge occurs, it disappears from the web UI.
