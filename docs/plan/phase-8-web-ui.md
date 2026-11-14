# Phase 8: web UI

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 7](phase-7-background-sync.md) · Next: [Phase 9](phase-9-hardening.md)

Read the working rules before starting any task here.

**Depends on:** Server only: P8-W1 needs a release of P3-S1, P8-W2 needs P4-S2, P8-W3 needs phase 6's server tasks. It can run alongside the app track; the exit check needs the app to produce data. See [Parallel work](README.md#parallel-work).

**Outcome:** FinanceKit is a first-class integration in the web app. The Add account menu points at the iOS app, accounts are labelled "Apple Wallet" with their last sync time, credit cards show their limit, and pending transactions are badged.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P8-W1 | Regenerate web clients | budget | Agent |
| [ ] | P8-W2 | Integration label and the Add account call-out | budget | Agent |
| [ ] | P8-W3 | Pending badge, last synced, stale warning, credit limit | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

Everything here reads fields that already work. No budget-server or app changes are expected; if one seems necessary, stop and ask. The web app does not call `FinanceKitService` and has no key. The Sync button for these accounts is phase 10.

## Tasks

### P8-W1 Regenerate web clients

- Bump the proto ref in `buf.gen.yaml` (currently `v0.14.0`, well behind production) to the current budget-server release and run `pnpm generate`.
- List in the PR every generated change that does not come from this plan. Fix any compile breaks they cause without changing behaviour.
- Exclude `financekit/v1` from the web's generation if buf allows it cleanly; the web never calls it.
- No model, query or component changes. The new wire fields are ignored for now.

Acceptance: `pnpm lint`, `pnpm test` and `pnpm build` pass; in budget-stack the app looks and behaves exactly as before.

### P8-W2 Integration label and the Add account call-out

- `src/models/account.ts`: add `FinanceKit = 3` to `AccountIntegration`; replace the stubbed `integrationFromWireAccount` with a real mapping from the wire enum. Update `account_test.ts` and `src/test/wire.ts`. Remove the matching "Server RPC gaps" entry from `spec/arch.md`.
- `accountSyncLabel.ts`: `"Apple Wallet"` for FinanceKit, and the real `"Plaid"` / `"Manual"` now that the field is populated.
- `AddAccountMenu.tsx`: a third item, **Apple Card, Cash or Savings**, which opens the call-out instead of a form.
- `components/Account/AppleWalletCallout/Modal.tsx`, static content: these accounts are added from the OpenPersonalFinance iPhone app; the steps (install from TestFlight, enter this site's address with `/api`, paste a key, grant Wallet access, tap Add to budget); the address shown is derived from `window.location.origin` with a copy button. No RPC is called and no account is created.
- Edit and delete for FinanceKit accounts: renaming and deleting work as for any account. In `EditAccountModal`, starting balance is read-only for FinanceKit accounts, as it should be for anything synced; the delete confirmation adds that the app will show the account as deleted and can add it again.
- Add a FinanceKit account to the `?mock=true` demo data.

Acceptance: unit tests for the model mapping and labels; component tests for the menu item, the call-out content and copied address, and the read-only starting balance; no CSP change.

### P8-W3 Pending badge, last synced, stale warning, credit limit

- `src/models/transaction.ts`: `pending: boolean`. `src/models/account.ts`: `lastSyncedAt?: Date`, `creditLimit?: string`. Update tests and `src/test/wire.ts`.
- Pending badge in `TransactionsTable` and `CategoryTransactionsTable`.
- Accounts table: last-synced time for FinanceKit accounts, "Never" before the first sync, a warning when older than 48 hours with a hint to open the app.
- Credit card rows with a limit show the limit and available credit (limit minus amount owed); the calculation is a pure helper in `models/money.ts` or beside the table, with the sign convention taken from the contract.
- Confirm FinanceKit transactions render correctly in `TransactionsTable` and `AccountTransactionsView`.
- Demo data: one pending transaction; one stale FinanceKit account; one card with a limit.

Acceptance: component tests for the badge, "Never", the stale warning and the limit display; pure helpers with unit tests decide staleness and available credit.

## Exit check

- **Add account → Apple Card, Cash or Savings** shows the call-out with the right address, and creates nothing.
- FinanceKit accounts are labelled "Apple Wallet", not "Manual", and show their last sync time.
- The Apple Card row shows its limit and available credit, matching Wallet.
- A pending purchase is badged, and loses the badge after it settles.
- An account that has not synced for 48 hours shows the warning.
- Deleting a FinanceKit account in the web UI shows it as "Deleted on server" in the app, and it can be added again.
