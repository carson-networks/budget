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
| `BGAppRefreshTask` | When iOS grants it; requested at the chosen interval | Backup when background delivery is delayed, and retries changes still behind a saved token after an offline or timed-out wake |
| App becomes active | Every open, throttled to five minutes | Guaranteed |
| Live monitoring | While the app is open | Keeps the screen current |
| **Sync Now** | On demand | Manual |
| Silent push from the server | Added in phase 10 | A nudge from the web UI's Sync button |

## Tasks

### P7-A1 Sync from the delivery extension

- `didReceiveData(for:)` builds `Dependencies.live()` and runs `SyncEngine.run(trigger: .backgroundDelivery)` inside a `Task` tracked by a `Mutex` or actor (coalescing or serializing overlapping `didReceiveData(for:)` calls so a second wake never overwrites an in-flight handle), replacing the phase 1 `WakeProbe` call. It shares settings, tokens, logs and lock with the app through the App Group (`group.net.carsonnetworks.OpenPersonalFinance`, also used as `kSecAttrAccessGroup`).
- `willTerminate()` cancels active work **and awaits its graceful completion** (bounded by a short grace timeout) before returning so `SyncLease` release and run/wake log writes (executed inside Swift 6.4 `async defer` + `withTaskCancellationShield`) finish cleanly before the extension exits. The engine checks for cancellation between batches and between accounts, so it always stops on a committed boundary.
- A run budget: stop starting new batches after a fixed time (start at 20 seconds, tune from the phase 2 wake log) and leave the rest for the next trigger.
- Locked phone: `.dataUnavailable` ends the run as "will retry" without marking anything as failed.
- The wake log from phase 1 stays, now written by the engine with the run's outcome.

Acceptance: engine tests for cancellation at each boundary (confirming `SyncLease` is released and logs flush cleanly) and for the time budget, each leaving saved tokens consistent; a test for overlapping extension wakes and `willTerminate()` awaiting cleanup; a test that an extension-style run and an app-style run against the same directory serialise through the lease; the extension still links only the `Live` product and its entry point holds no logic.

### P7-A2 Background refresh and live monitoring

- `BGAppRefreshTask`: handled via `.backgroundTask(.appRefresh(...))` on the app's scene (replacing the phase 1 `WakeProbe` call; SwiftUI cancels the task automatically on expiration) and rescheduled with `BGTaskScheduler.shared.submit` after every run and after every app backgrounding, with `earliestBeginDate` from the chosen interval. Its handler runs the engine with trigger `.backgroundRefresh` and the same budget and cancellation handling as the extension.
- Live monitoring while the app is active: a monitoring history sequence per owned account that triggers a debounced engine run when it yields. Stopped when the app leaves the foreground. The monitor and its debounce live in `Sync`; the app target only starts and stops it on scene phase changes.
- `FinanceDataSource` gains a `changesStream` for this, implemented in `FinanceKitSource`; the fake can emit on demand.

Acceptance: tests for the reschedule calculation (pure, in `Domain`), the debounce, and that monitoring stops on background; with the fake emitting a new transaction while the app is open in the Simulator, it appears in budget-server without touching the screen.

### P7-A3 Sync schedule settings and stale notification

- Settings → Sync Schedule: **Hourly**, **Daily**, **Weekly**, **Manual Only**. This replaces the phase 1 frequency picker and its model. The new model depends on `SyncScheduling` (phase 1), whose `SyncSchedule` in `Sync` saves the choice, applies it through `BackgroundDeliveryControl` and sets the refresh interval to match: 1 hour, 6 hours, 24 hours.
- Re-applied at every launch, since the system setting does not report back.
- A plain-language note under the picker: iOS decides the exact timing, and Background App Refresh must be on for the app. Show a warning row when it is off.
- Stale warning: a local notification, scheduled after each successful sync for a threshold later (twice the chosen interval, at least 48 hours) and replaced by the next success. If no sync succeeds, it fires: "OpenPersonalFinance hasn't synced since <date>. Open the app." Requires notification permission, requested from this settings screen, not at first launch. The engine reschedules it after a successful run from either process, through a `StaleNotifier` protocol in `Domain` implemented with UserNotifications in `Live`.
- The Accounts tab shows the same stale state as a banner.

Acceptance: unit tests for the interval mapping and the stale threshold; model tests for the Background App Refresh warning and the permission states.

## Exit check

- With the schedule on Hourly and the app force-closed, a purchase appears in the web UI without opening the app. Note how long it took.
- With the phone off the network at the time of a wake, the purchase arrives after the network returns, without opening the app.
- Over 48 hours, the run log shows background runs from the extension and no failed run that was not retried.
- Switching to Manual only stops background runs.
- Putting the phone in airplane mode past the threshold produces the stale notification.
