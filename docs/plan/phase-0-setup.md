# Phase 0: setup

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Next: [Phase 1](phase-1-financekit-read.md)

Read the working rules before starting any task here.

**Depends on:** Nothing. P0-X1 is independent of the other tasks here. See [Parallel work](README.md#parallel-work).

**Outcome:** an empty `OpenPersonalFinance` app with its extension and package builds, lints and tests in CI, reaches TestFlight from a tag, and is installed on the phones. budget-stack can run local builds. The app does nothing but show its version.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [ ] | P0-H1 | Apple identifiers and capabilities | — | Human |
| [ ] | P0-H2 | Create the Xcode project from templates | budget | Human |
| [ ] | P0-A1 | Project skeleton | budget | Agent |
| [ ] | P0-A2 | CI for `ios/` | budget | Agent |
| [ ] | P0-A3 | TestFlight release workflow | budget | Agent |
| [ ] | P0-X1 | Local-build mode in budget-stack | budget-stack | Agent |
| [ ] | P0-H3 | Signing secrets and first TestFlight build | — | Human |
| [ ] | — | Exit check passed | — | Human |

## Layout

```
ios/
  OpenPersonalFinance.xcodeproj   # committed; folder-synchronized groups
  Makefile                        # format, lint, test, proto-generate
  OpenPersonalFinance/            # app target: SwiftUI views, app entry, entitlements
  OpenPersonalFinanceDelivery/    # FinanceKit background delivery extension target
  OpenPersonalFinanceKit/         # local Swift package: all logic and tests
    Sources/OpenPersonalFinanceKit/
    Tests/OpenPersonalFinanceKitTests/
  buf.gen.yaml                    # added in phase 3
docs/
  plan/                           # this plan
  ios-release.md                  # added in P0-A3
```

## Tasks

### P0-H1 Human: Apple identifiers and capabilities

1. Register two App IDs: `net.carsonnetworks.OpenPersonalFinance` for the app and `net.carsonnetworks.OpenPersonalFinance.Delivery` for the extension. Enable **FinanceKit** on both (the managed capability from the approved entitlement) and **App Groups** with one shared group, `group.net.carsonnetworks.OpenPersonalFinance`.
2. Create the App Store Connect app record and add the phones' Apple IDs as internal testers.
3. Tell the agent the team ID. It is not secret.

### P0-H2 Human: Create the Xcode project from templates

Xcode's templates set up the extension correctly, so this is done by hand once, about five minutes. No project generator is used.

1. In Xcode: File → New → Project → iOS App. Name `OpenPersonalFinance`, bundle ID `net.carsonnetworks.OpenPersonalFinance`, SwiftUI, Swift Testing, saved in `ios/`.
2. File → New → Target → **Background Delivery Extension**, named `OpenPersonalFinanceDelivery`, bundle ID `net.carsonnetworks.OpenPersonalFinance.Delivery`.
3. On both targets, Signing & Capabilities: add **FinanceKit** and **App Groups** with `group.net.carsonnetworks.OpenPersonalFinance`.
4. Set both targets' deployment target to iOS 26.
5. Commit the result on a branch and hand it to the agent. Do not add `xcuserdata`.

### P0-A1 Project skeleton

Starts from the branch P0-H2 produced.

- Add the local package `ios/OpenPersonalFinanceKit` and link it from both targets. Swift 6 language mode and strict concurrency on the package and both targets.
- Confirm, and fix if needed: both targets use folder-synchronized groups, target iOS 26, and carry the FinanceKit and App Group entitlements. Add `NSFinancialDataUsageDescription` to the app's Info.plist. A shared scheme is committed so CI can build it.
- App: one SwiftUI screen showing the app name, version and build. Extension: an empty `BackgroundDeliveryExtensionProviding` implementation that does nothing.
- `OpenPersonalFinanceKit`: one placeholder type with one Swift Testing test, so the test pipeline has something to run.
- `ios/Makefile`: `format` and `lint` (swift-format, config committed), `test` (`xcodebuild test` on an iOS 26 Simulator), `help`. Tool versions pinned in `ios/mise.toml`.
- `.gitignore`: `DerivedData`, `xcuserdata`. The `.xcodeproj` itself is committed.
- Root `README.md`: a short "iOS app" section pointing at `ios/` and this plan.

Acceptance: from a clean checkout, `make -C ios test` passes on this Mac; `make -C ios lint` is clean; the app launches in the Simulator; the web checks (`pnpm lint`, `pnpm test`, `pnpm build`) are unaffected.

### P0-A2 CI for `ios/`

- New workflow `.github/workflows/ios.yml`: on pushes that change `ios/**` or the workflow itself, on `macos-26`: lint, build and test on a Simulator, with no code signing.
- Add `paths-ignore` for `ios/**` and `docs/**` to the existing web `CI` and `Docker` workflows so an iOS-only change does not rebuild the web image. Tag pushes must still build the image.
- Add the Swift package and the new workflow's actions to `renovate.json` coverage if they are not picked up automatically.

Acceptance: the workflow file passes `actionlint`; a dry read confirms a web-only change does not trigger it and an iOS-only change does not trigger the Docker build. The agent cannot observe the first run; say so in the PR.

### P0-A3 TestFlight release workflow

Copy the shape of `weather-client/.github/workflows/ios-release.yml`, replacing the Flutter steps with `xcodebuild archive` and `-exportArchive`.

- `.github/workflows/ios-release.yml`: triggered by tags `ios-v*.*.*` and by `workflow_dispatch` with an optional version input. Same version validation, same secret presence check, same certificate import, same upload action, same clean-up step.
- Two provisioning profiles, one per target (app and extension). Secrets: `IOS_DISTRIBUTION_CERTIFICATE_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`, `IOS_APP_PROVISIONING_PROFILE_BASE64`, `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`.
- Fail early if either profile lacks the FinanceKit entitlement or the App Group. Phase 10 adds a production-push check for the app profile.
- Marketing version from the tag; build number from the run number and attempt, as weather-client does.
- The existing `Docker` workflow builds on tags matching `v*`; confirm `ios-v*` does not match it.
- `docs/ios-release.md`, adapted from weather-client's: the secrets and how to produce each, how to tag, where the build appears.

Acceptance: `actionlint` passes; the differences from weather-client's workflow are listed in the PR and are limited to Flutter removal, the second profile, the tag prefix and the entitlement check.

### P0-X1 Local-build mode in budget-stack

Repo: `../budget-stack`.

- `compose.local.yaml`: an override giving `budget-server` and `web` a `build:` context at the sibling checkouts (`../budget-server`, `../budget`) and a `:local` image tag.
- Make targets `start-local` (build, then start with the override) and `rebuild-local` (`make rebuild-local s=budget-server`). The Go image builds with `-mod=vendor`, so the target runs `go mod vendor` first. A missing sibling checkout fails with a message naming the path.
- `README.md`: a "Developing across repos" section, including that the iOS Simulator reaches the stack at `http://localhost:8080/api`.
- Replace `docs/apple-sync-plan.md` with a pointer to `budget/docs/plan/README.md`, and commit it (it is currently untracked).

Acceptance: `docker compose config` validates with and without the override; `make start-local` runs both services from local source and a visible change shows up after `make rebuild-local`.

### P0-H3 Human: Signing secrets and first TestFlight build

1. Create the distribution certificate and the two App Store profiles; add the seven secrets from `docs/ios-release.md`.
2. Merge the PRs, confirm the `iOS` workflow is green, push tag `ios-v0.1.0`.
3. Install the build from TestFlight on each phone.

## Exit check

- A push touching `ios/` runs the iOS workflow and nothing else; a web-only push does not run it.
- Tag `ios-v0.1.0` produces a TestFlight build that installs and shows version 0.1.0.
- The installed build's entitlements include FinanceKit and the App Group (Settings shows the app under Privacy → Wallet once it asks, in phase 1; for now check the archive's entitlements in the workflow log).
- `make start-local` in budget-stack works and the web app behaves as before.
