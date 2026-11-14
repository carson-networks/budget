# Phase 4: accounts and auth

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 3](phase-3-server-endpoints.md) · Next: [Phase 5](phase-5-transactions.md)

Read the working rules before starting any task here.

**Depends on:** Server tasks need P3-S1. P4-A1 needs P3-A2 and P1-A2, and can be built against fakes before the server tasks land; the exit check needs both. See [Parallel work](README.md#parallel-work).

**Outcome:** accounts work end to end. The service requires a key, a Wallet account added in the app exists in budget-server as a FinanceKit-type account, and a second phone sees who owns it.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P4-S1 | API keys and authentication | budget-server | Agent |
| [ ] | P4-S2 | Sync type, provider, links and account RPCs | budget-server | Agent |
| [ ] | P4-A1 | Accounts screen: add, take over, unlink | budget | Agent |
| [ ] | P4-X1 | Key runbook | budget-stack, infra-prod | Agent |
| [ ] | — | Exit check passed | — | Human |

The web UI is untouched until phase 8, so a FinanceKit account shows there as "Manual" for now.

## Tasks

### P4-S1 API keys and authentication

- Migration: the `api_keys` table from the contract.
- Storage reader/writer for keys, following `internal/storage/plaid/`; interfaces added to `.mockery.yaml`.
- Key tool `scripts/api_key/main.go`, built into the image as `/budget-server-key` the way the migration runner is: `create <name>` (32 random bytes, base64url, printed once, sha256 stored), `list` (id, name, created, last used, revoked), `revoke <id>`.
- A Connect interceptor applied to `FinanceKitService` only: missing, unknown or revoked key → `Unauthenticated`; a valid key touches `last_used_at` (at most once a minute) and puts the key's id and name on the context. Constant-time comparison is not needed since lookup is by hash, but never log the key or the hash.
- Implement `GetStatus`: the key's name and the server version. `push_enabled` stays false until phase 10.
- The existing services are not wrapped and behave as before.

Acceptance: tests for the key lifecycle and each auth outcome; a test proving `AccountService` and the other existing services still answer without a header; the tool's output works as a bearer token in budget-stack; a log search after the tests finds no key material.

### P4-S2 Sync type, provider, links and account RPCs

- `SyncType_FinanceKit SyncType = 2` in `internal/storage/sync/model.go`.
- No-op provider `internal/sync/providers/financekit.go` (`Sync` returns an empty `SyncResult`), registered in `main.go`. Phase 10 makes it send a silent push.
- Migration: `financekit_account_links` from the contract. Storage reader/writer in `internal/storage/financekit/`.
- Action `financekit_link_account.go`: in one transaction, either creates the account, its `syncs` row and the link, or attaches a link to an existing FinanceKit-type account and changes its owner.
- Implement `ListAccounts`, `LinkAccount` and `UnlinkAccount`, replacing their `Unimplemented` responses, with the contract's error codes.
  - `LinkAccount` is idempotent: the same key linking the same FinanceKit ID again returns the same `account_id`.
  - Linking an account owned by another active key without `take_over` → `FailedPrecondition`, with the owner's key name in the message.
  - `UnlinkAccount` removes the caller's link row only.
- Populate `Account.integration` from the `syncs` row in `AccountService.ListAccounts`.
- `AccountService.CreateAccount` keeps creating manual accounts only; nothing outside `LinkAccount` can produce a FinanceKit-type account.
- No proto changes.

Acceptance:
- Tests: action; provider; a sync-all with one Plaid and one FinanceKit account succeeds; `FinanceKitService.ListAccounts` excludes manual and Plaid accounts; `AccountService.ListAccounts` reports all three integrations; idempotent relink; take-over with the same and with a different FinanceKit ID; non-USD refused.
- Deleting a FinanceKit account through the existing `DeleteAccount` works and removes its links.

### P4-A1 Accounts screen: add, take over, unlink

- Accounts tab, the app's main screen. Rows are the union of Wallet accounts (from `FinanceDataSource`) and `ListAccounts`, joined on FinanceKit account ID, each in one of these states: **Not added**, **Syncing** (linked and owned by this phone), **Synced by <key name>** (owned by another key), **Removed from Wallet** (linked here but no longer shared by FinanceKit), **Deleted on server** (was linked, now gone).
- **Add to budget** on a "Not added" row: a sheet with name (default `displayName`), and for asset accounts a Cash / Savings choice; then `LinkAccount` with `new_account`.
- When the server already has an unowned-by-me FinanceKit account that plausibly is the same one (same institution and type), the sheet offers **Link to existing** as well, which calls `LinkAccount` with `existing_account_id` and `take_over`.
- **Take over** on a "Synced by" row, behind a confirmation that explains the other phone will stop syncing it.
- **Stop syncing** (swipe action): `UnlinkAccount`, clears that account's tokens. Says plainly that the account and its transactions stay in budget and can be deleted from the web app.
- The join and state derivation are one pure function with unit tests; the view model is tested against `FakeBudgetAPI` and `FakeFinanceDataSource`.
- Settings shows the key name returned by `GetStatus`.

Acceptance: unit tests for every row state and each action's success and failure; in the Simulator against `make start-local`, adding the fixture's two accounts creates them in budget-server and they appear in the web app.

### P4-X1 Key runbook

- budget-stack `README.md`: creating, listing and revoking a key with `docker compose exec budget-server /budget-server-key ...`.
- `infra-prod/app-prod/budget/`: a short `README.md` (or the existing notes file if there is one) with the production form of the same commands, and the reminder to create one key per phone, named after the phone.
- Confirm the edge Caddyfile passes the `Authorization` header through unchanged; no change is expected.

Acceptance: the commands in both documents work when pasted against budget-stack.

## Exit check

- Without a key, or with a wrong or revoked one, **Test connection** says so and nothing else works.
- Adding a Wallet account in the app creates it in budget-server; it shows in the web UI's account list.
- The second phone, with its own key, shows that account as "Synced by <first phone>" and can take it over.
- A manual account and a Plaid account do **not** appear in the app.
- There is still no way to create a FinanceKit account from the web UI.
- Plaid sync still works with a FinanceKit account present.
