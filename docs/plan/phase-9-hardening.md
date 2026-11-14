# Phase 9: hardening

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 8](phase-8-web-ui.md) · Next: [Phase 10](phase-10-server-requested-sync.md)

Read the working rules before starting any task here.

**Depends on:** Phases 6, 7 and 8, and the phase 2 shared-accounts decision. Not phase 10. See [Parallel work](README.md#parallel-work).

**Outcome:** every Apple account on every phone syncs in the background for a week with no duplicates and no manual steps, shared accounts behave as decided in phase 2, and a failure is noticed.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P9-S1 | Shared accounts, per the phase 2 decision | budget-server, budget | Agent |
| [ ] | P9-A1 | App edge cases | budget | Agent |
| [ ] | P9-X1 | Operations | infra-prod, budget-stack | Agent |
| [ ] | P9-H1 | Go live on all accounts and phones | — | Human |
| [ ] | — | Exit check passed | — | Human |

## Tasks

### P9-S1 Shared accounts, per the phase 2 decision

Do the branch the contract's "Ownership" section names, and delete the other from this file in the PR.

- **IDs match on both phones:** lift the single-owner rule. Any active key with a link to the account may `PushChanges`; `LinkAccount` with `existing_account_id` no longer needs `take_over` and no longer changes the owner. `ListAccounts` reports the account as owned by every linked caller. App: the "Synced by" state and **Take over** are replaced by **Also sync from this phone**. Tests: two keys pushing overlapping batches in either order end in the same state; concurrent pushes for one account do not deadlock or duplicate.
- **IDs differ:** keep the single owner. Make take-over safe: `LinkAccount` with `take_over` marks the account so the new owner's first push must be a full resync, and during that resync an incoming transaction with no link is matched to an existing linked transaction on the same account with the same amount, date and description before a new row is created; a match re-keys the link and keeps the category. App: take-over starts the full resync automatically. Tests: take-over with entirely different IDs produces no duplicates and keeps categories; two identical charges on one day stay two.

### P9-A1 App edge cases

- Wallet access revoked, or one account removed from sharing: detected at the next run, shown as a state on the row and a banner, with a link to Settings → Privacy → Wallet. No server call is made for an account that is no longer readable.
- Endpoint or key changed in Settings: outbox and tokens are kept if `GetStatus` returns the same server and key name, otherwise the person is asked whether to start over (clears outbox, tokens and run log).
- A key revoked on the server: every trigger stops after `GetStatus`; one notification, not one per wake.
- Outbox poison: a batch refused with `InvalidArgument` three times is moved aside, reported in the run log and on the account row, and the account is queued for a full resync.
- Clock and time zone: transaction dates are sent as instants; add a test that a purchase near midnight lands in the same month the web UI shows for it.
- Accessibility pass on every screen: Dynamic Type, VoiceOver labels on status rows, dark mode.

Acceptance: engine and view-model tests for each case above.

### P9-X1 Operations

- An alert when no FinanceKit account has synced in 48 hours, using whatever the `uptime` stack in infra-prod already supports (a SQL or HTTP check against `last_synced_at`); if that needs a new unauthenticated endpoint, stop and ask.
- Confirm the Postgres backup covers the new tables (they are in the same database, so this should be a check, not a change).
- budget-stack and infra-prod READMEs: key rotation (create new, paste into the app, revoke old) and what a phone replacement involves (new key, FinanceKit access again, take over or relink each account).
- `docs/ios-release.md`: a note that TestFlight builds expire after 90 days and how to re-release.

### P9-H1 Human: Go live on all accounts and phones

- Take a database dump.
- On each phone: its own key, add or link every Wallet account, schedule on Hourly.
- Delete or archive any manual Apple Card / Cash / Savings accounts that the FinanceKit ones replace, after checking the balances agree.
- Set a calendar reminder for the TestFlight expiry.

## Exit check

One week of background sync across all accounts and phones: no duplicates, balances and credit limit correct, no manual intervention, and the stale alert stayed quiet.
