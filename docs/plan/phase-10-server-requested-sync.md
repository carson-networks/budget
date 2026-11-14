# Phase 10: server-requested sync

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 9](phase-9-hardening.md) · Next: [Phase 11](phase-11-follow-ups.md)

Read the working rules before starting any task here.

**Depends on:** P10-S1 needs P4-S1; P10-S2 needs P4-S2; P10-A1 needs P5-A1 and P7-A1; P10-W1 needs P8-W2 and P10-S2. Not phase 9. See [Parallel work](README.md#parallel-work).

**Outcome:** syncing an Apple Wallet account from the web UI asks the phone that owns it to sync, using a silent push. Data still only flows phone → server; the server can now ask.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P10-H1 | APNs key and push capability | — | Human |
| [ ] | P10-S1 | Push token storage and `RegisterPushToken` | budget-server | Agent |
| [ ] | P10-S2 | APNs sender behind the sync provider | budget-server | Agent |
| [ ] | P10-A1 | Register for push and sync on a silent push | budget | Agent |
| [ ] | P10-X1 | APNs configuration in the stack and production | budget-stack, infra-prod | Agent |
| [ ] | P10-W1 | Sync button in the web UI | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

No proto change: `RegisterPushToken`, `PushEnvironment` and `GetStatusResponse.push_enabled` were defined in phase 3. This phase implements them.

## What to expect from silent push

- iOS throttles silent pushes and may delay or drop them. This is a nudge, not a guarantee; the phase 7 triggers stay as they are.
- A force-quit app does not receive them until it is opened again.
- The phone still has to reach the server when it wakes.

The web UI therefore says "Sync requested", never "Synced", and relies on the last-synced time to show the result.

## Tasks

### P10-H1 Human: APNs key and push capability

1. Create an APNs auth key (`.p8`) in the developer account; note the key ID and team ID.
2. Enable Push Notifications on the `net.carsonnetworks.OpenPersonalFinance` App ID, add the capability to the app target in Xcode, and regenerate the app's App Store provisioning profile; update `IOS_APP_PROVISIONING_PROFILE_BASE64`.
3. Put the key, key ID and team ID in the production `.env`. Never commit the key.

### P10-S1 Push token storage and `RegisterPushToken`

- Migration:
  ```sql
  ALTER TABLE api_keys ADD COLUMN apns_token TEXT;
  ALTER TABLE api_keys ADD COLUMN apns_environment SMALLINT;
  ALTER TABLE api_keys ADD COLUMN apns_token_updated_at TIMESTAMPTZ;
  ```
  A key is a phone, so the token lives on the key. Revoking a key clears its token.
- Implement `RegisterPushToken` behind the existing bearer interceptor, replacing its `Unimplemented` response, and populate `GetStatusResponse.push_enabled`.
- Never log the token.

Acceptance: tests for set, replace, clear, and clear-on-revoke; migration applies and rolls back.

### P10-S2 APNs sender behind the sync provider

- Config in `ProcessEnvironmentVariables()`: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8`, `APNS_BUNDLE_ID`. All optional: when any is unset, push is disabled and the server starts normally.
- `internal/apns/`: a small client behind an interface (mock added to `.mockery.yaml`) that sends a silent push (`content-available: 1`, push type `background`, priority 5, no alert) with token-based auth. Ask before adding a dependency; `sideshow/apns2` is the expected choice.
- The FinanceKit provider stops being a no-op: `Sync` looks up the owning key of each requested account and sends one silent push per distinct phone that has a token. It still returns an empty `SyncResult`, since the data arrives later through `PushChanges`.
- A failure to send is logged and never fails the sync call: a sync-all that includes Plaid accounts must still succeed when Apple is unreachable or push is disabled.
- A token APNs reports as unregistered or bad is cleared.
- At most one push per phone per minute.

Acceptance: tests with the mocked client for one push per phone across several accounts, no token, push disabled, send failure not failing a mixed Plaid + FinanceKit sync-all, bad-token clean-up, and the rate limit.

### P10-A1 Register for push and sync on a silent push

- The `remote-notification` background mode on the app target, and the `aps-environment` entitlement that P10-H1's capability adds.
- Register for remote notifications at launch. This needs no permission prompt for silent pushes. Send the token with `RegisterPushToken` when it is new or changed, and only when `GetStatus` reports `push_enabled`; the environment comes from the build's entitlement.
- A silent push runs `SyncEngine.run(trigger: .serverRequest)` with the same time budget and cancellation handling as the extension, and reports the fetch result to the system.
- `BudgetAPI` and `FakeBudgetAPI` gain the new call. The generated client already has it from phase 3.
- Settings shows whether server-requested sync is available; the run log shows the new trigger.
- `ios-release.yml`: the app profile check also requires production push, as weather-client's does.

Acceptance: tests for token registration (new, unchanged, rotated, server without push) and for a server-requested run ending on a committed boundary when cancelled; the PR states that delivery can only be observed on a device.

### P10-X1 APNs configuration in the stack and production

- budget-stack `compose.yaml` and `.env.example`: the four variables, optional, with a comment that leaving them empty disables push.
- `infra-prod/app-prod/budget/docker-compose.yml`: the same. budget-server already has egress on the `default` network; confirm nothing blocks `api.push.apple.com:443`.
- READMEs: where the `.p8` contents go and that the key is never committed.

Acceptance: `docker compose config` validates in both with the variables set and unset.

### P10-W1 Sync button in the web UI

- Uses the existing `AccountService.SyncAccounts` RPC: no new RPC and no key in the browser. The web app does not call it today, so add `accountMutations.sync` in `src/queries/accounts.ts` (invalidating accounts and transactions) and a **Sync** button in the accounts table: one per synced account, Plaid and Apple Wallet alike, plus a **Sync all** in the header. Manual accounts get no button.
- For Plaid accounts the call completes the sync, so the row shows a spinner and then the refreshed data. For Apple Wallet accounts the feedback is "Sync requested from <phone>" rather than a completed state, and the accounts query is refetched after a short delay so the last-synced time updates when the phone responds.
- When the owning phone has never registered a token, the row says so and points at opening the app.
- Demo data and tests updated.

Acceptance: query tests for the mutation's arguments and invalidation; component tests for which rows get a button, the Plaid completed state, the requested state, the delayed refetch (fake `Date` only) and the no-token hint; `pnpm lint`, `pnpm test`, `pnpm build` pass.

## Exit check

- The **Sync** button on a Plaid account pulls new transactions as before.
- With the app in the background, syncing the Apple Card from the web UI makes its last-synced time advance within a few minutes, without touching the phone.
- With push variables unset, the server starts, Plaid sync-all works, and the web UI says sync cannot be requested.
- A sync-all with Plaid and Apple Wallet accounts succeeds while the phone is off.
- Revoking a key stops pushes to that phone.
