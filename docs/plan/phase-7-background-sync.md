# Phase 7: background sync

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 6](phase-6-after-first-insert.md) · Next: [Phase 8](phase-8-web-ui.md)

Read the working rules before starting any task here.

**Depends on:** P5-A1 and P1-A4. No server work, so it can run alongside phase 6; the exit check needs phase 6 deployed. See [Parallel work](README.md#parallel-work).

**Outcome:** new transactions reach budget-server on the chosen interval with the app closed and the phone in a pocket. The app tells you when that has stopped working.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P7-A1 | Sync from the delivery extension | budget | Agent |
| [ ] | P7-A2 | Background refresh and live monitoring | budget | Agent |
| [ ] | P7-A3 | Sync schedule settings and stale notification | budget | Agent |
| [ ] | — | Exit check passed | — | Human |

No server changes. Every trigger runs the same `SyncEngine.run`; this phase only adds callers.

## Triggers

| Trigger | When | Role |
|---|---|---|
| FinanceKit background delivery | Wallet data changed, within the chosen `hourly` / `daily` / `weekly` window | Primary |
| `BGAppRefreshTask` | When iOS grants it; requested at the chosen interval | Backup, and the only one that retries an outbox left by a failed push |
| App becomes active | Every open, throttled to five minutes | Guaranteed |
| Live monitoring | While the app is open | Keeps the screen current |
| **Sync now** | On demand | Manual |
| Silent push from the server | Added in phase 10 | A nudge from the web UI's Sync button |

## Tasks

### P7-A1 Sync from the delivery extension

- `didReceiveData(for:)` runs `SyncEngine.run(trigger: .backgroundDelivery)` in place of the phase 1 logging-only body, with the settings, tokens, outbox and lock it shares with the app through the App Group and Keychain access group.
- `willTerminate()` cancels the run cooperatively. The engine checks for cancellation between batches and between accounts, so it always stops on a committed boundary.
- A run budget: stop starting new batches after a fixed time (start at 20 seconds, tune from the phase 2 wake log) and leave the rest for the next trigger.
- Locked phone: `.dataUnavailable` ends the run as "will retry" without marking anything as failed.
- The wake log from phase 1 stays, now recording the run's outcome.

Acceptance: engine tests for cancellation at each boundary and for the time budget, each leaving tokens and outbox consistent; a test that an extension-style run and an app-style run against the same directory serialise through the lock; the extension target builds with only the package and no SwiftUI app code.

### P7-A2 Background refresh and live monitoring

- `BGAppRefreshTask`: registered at launch, rescheduled after every run and after every app backgrounding, with `earliestBeginDate` from the chosen interval. Runs the engine with trigger `.backgroundRefresh` and the same budget and cancellation handling as the extension.
- Live monitoring while the app is active: a monitoring history sequence per owned account that triggers a debounced engine run when it yields. Stopped when the app leaves the foreground.
- `FinanceDataSource` gains a `changesStream` for this; the fake can emit on demand.

Acceptance: tests for the reschedule calculation (pure), the debounce, and that monitoring stops on background; with the fake emitting a new transaction while the app is open in the Simulator, it appears in budget-server without touching the screen.

### P7-A3 Sync schedule settings and stale notification

- Settings → Sync schedule: **Hourly**, **Daily**, **Weekly**, **Manual only**. Changing it calls `enableBackgroundDelivery(for:frequency:)` for all three data types (or `disableAllBackgroundDelivery()`), and sets the refresh interval to match: 1 hour, 6 hours, 24 hours.
- Re-applied at every launch, since the system setting does not report back.
- A plain-language note under the picker: iOS decides the exact timing, and Background App Refresh must be on for the app. Show a warning row when it is off.
- Stale warning: a local notification, scheduled after each successful sync for a threshold later (twice the chosen interval, at least 48 hours) and replaced by the next success. If no sync succeeds, it fires: "OpenPersonalFinance hasn't synced since <date>. Open the app." Requires notification permission, requested from this settings screen, not at first launch.
- The Accounts tab shows the same stale state as a banner.

Acceptance: unit tests for the interval mapping and the stale threshold; view-model tests for the Background App Refresh warning and the permission states.

## Exit check

- With the schedule on Hourly and the app force-closed, a purchase appears in the web UI without opening the app. Note how long it took.
- With the phone off the network at the time of a wake, the purchase arrives after the network returns, without opening the app.
- Over 48 hours, the run log shows background runs from the extension and no failed run that was not retried.
- Switching to Manual only stops background runs.
- Putting the phone in airplane mode past the threshold produces the stale notification.
