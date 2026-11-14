# Phase 2: phone test

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 1](phase-1-financekit-read.md) · Next: [Phase 3](phase-3-server-endpoints.md)

Read the working rules before starting any task here.

**Depends on:** Phase 1, installed from TestFlight. See [Parallel work](README.md#parallel-work).

**Outcome:** the device-only questions are answered on real phones, the contract is corrected to match, and the shared-account approach is decided. Nothing in budget-server or the web UI has been touched yet.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P2-H1 | Device tests | — | Human |
| [ ] | P2-A1 | Reconcile the contract with what the phones showed | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

## Tasks

### P2-H1 Human: Device tests

Use the phase 1 TestFlight build. Fill in the "Phone test results" table in the [sync contract](sync-contract.md).

1. **Balances.** For each account compare the diagnostics screen with the Wallet app: which balance is the amount owed on Apple Card, and its indicator.
2. **Signs.** Confirm a purchase is a debit on the card and on Cash; confirm a payment or refund is a credit.
3. **Pending lifecycle.** Make a small purchase. Use "Read again from saved token" right away and again after it settles. Note whether it is one ID that gets updated or a delete plus an insert.
4. **Rejected or reversed.** If one occurs during the test (for example a declined or cancelled charge), note how it arrives. Leave blank otherwise.
5. **Credit limit.** Confirm it is populated and matches Wallet.
6. **Two phones, one account.** On both phones that can see the same account, compare `Account.id` and the IDs of the same three transactions.
7. **Background delivery.** Set frequency to hourly, close the app, make a purchase, lock the phone. Read the wake log over 48 hours: when the extension woke, whether the read succeeded while locked, and how that compares with `BGAppRefreshTask`.
8. **Reachability.** From the phone's browser, open the budget web app on Wi-Fi, on cellular, and over the VPN. Set the VPN to on-demand for the server's hostname if it is not reachable on cellular.
9. Export one redacted fixture per account, including one export taken before and one after the pending charge settled, and hand them to the agent.

### P2-A1 Reconcile the contract with what the phones showed

- Add the exported fixtures under `ios/OpenPersonalFinanceKit/Tests/OpenPersonalFinanceKitTests/Fixtures/` with a test that loads each.
- Record the results table in the contract. For every answer that contradicts the contract, change the contract in the same PR: the balance row and sign, the pending row, the rejected row.
- Fix `FinanceKitDataSource` or the P1-A1 types for anything the fixtures show is missing or wrong.
- Write the shared-account outcome into the contract's "Ownership" section:
  - **IDs match on both phones:** note that phase 9 task P9-S1 lifts the single-owner rule.
  - **IDs differ:** the single-owner rule stays; note that P9-S1 is dropped and take-over must do a full resync.
- If the wake log shows background delivery is unusable (never fires, or cannot read while locked), stop and report: phase 7 needs rethinking, and phase 10's silent push would have to move ahead of it as the primary trigger.

Acceptance: every fixture loads; the contract's results table has no blank rows except "rejected" if none occurred; the PR lists each contract change, or states there were none.

## Exit check

The results table is complete, and:

| Decision | Answer |
|---|---|
| Balance field and sign for Apple Card | |
| Shared accounts: single owner, or any linked phone | |
| Background delivery is good enough to be the primary trigger | |

Go/no-go: ______
