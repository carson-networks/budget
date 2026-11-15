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
| [ ] | P0-H4 | FinanceKit for the extension (with Apple) | — | Human |
| [ ] | — | Exit check passed | — | Human |

## Layout

```
ios/
  OpenPersonalFinance.xcodeproj   # committed; Xcode 27 format (project.xcproj), folder-synchronized groups
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

1. Register two App IDs: `net.carsonnetworks.OpenPersonalFinance` for the app and `net.carsonnetworks.OpenPersonalFinance.Delivery` for the extension. Enable **App Groups** on both with one shared group, `group.net.carsonnetworks.OpenPersonalFinance`, and **FinanceKit** (a managed capability, under Additional Capabilities) on the app. FinanceKit is granted per bundle ID, so the extension's is requested separately (P0-H4).
2. Create the App Store Connect app record and add the phones' Apple IDs as internal testers.
3. Tell the agent the team ID. It is not secret.

### P0-H2 Human: Create the Xcode project from templates

Xcode's templates set up the extension correctly, so this is done by hand once, about five minutes. No project generator is used.

Created 2026-11-14; the agent then fixed the name, bundle ID, platforms and entitlements on `claude/ios-project`.

1. In Xcode 27: File → New → Project → **iOS** → App (not Multiplatform). Name `OpenPersonalFinance`, bundle ID `net.carsonnetworks.OpenPersonalFinance`, SwiftUI, Swift Testing, saved in `ios/`.
2. File → New → Target → **Background Delivery Extension**, named `OpenPersonalFinanceDelivery`, bundle ID `net.carsonnetworks.OpenPersonalFinance.Delivery`.
3. Signing & Capabilities: **App Groups** with `group.net.carsonnetworks.OpenPersonalFinance` on both targets; **FinanceKit** on the app only until P0-H4.
4. Set both targets to iPhone only, iOS 27.
5. Commit the result on a branch and hand it to the agent. Do not add `xcuserdata`.

### P0-A1 Project skeleton

Starts from the branch P0-H2 produced.

- Add the local package `ios/OpenPersonalFinanceKit` and link it from both targets. Swift 6 language mode and strict concurrency on the package and both targets.
- Confirm, and fix if needed: both targets use folder-synchronized groups, are iPhone only on iOS 27, carry the App Group entitlement, and the app carries FinanceKit. Add `NSFinancialDataUsageDescription` to the app's Info.plist. A shared scheme is committed so CI can build it.
- App: one SwiftUI screen showing the app name, version and build. Extension: the template's empty `BackgroundDeliveryExtension` implementation, doing nothing.
- `OpenPersonalFinanceKit`: one placeholder type with one Swift Testing test, so the test pipeline has something to run.
- `ios/Makefile`: `format` and `lint` (swift-format, config committed), `test` (`xcodebuild test` on an iOS 27 Simulator), `help`. Tool versions pinned in `ios/mise.toml`.
- `.gitignore`: `DerivedData`, `xcuserdata`. The `.xcodeproj` itself is committed.
- Root `README.md`: a short "iOS app" section pointing at `ios/` and this plan.

Acceptance: from a clean checkout, `make -C ios test` passes on this Mac; `make -C ios lint` is clean; the app launches in the Simulator; the web checks (`pnpm lint`, `pnpm test`, `pnpm build`) are unaffected.

### P0-A2 CI for `ios/`

- New workflow `.github/workflows/ios.yml`: on pushes that change `ios/**` or the workflow itself, on the `xcode-27` runner with Xcode 27.2 selected: lint, build and test on a Simulator, with no code signing.
- Add `paths-ignore` for `ios/**` and `docs/**` to the existing web `CI` and `Docker` workflows so an iOS-only change does not rebuild the web image. Tag pushes must still build the image.
- Add the Swift package and the new workflow's actions to `renovate.json` coverage if they are not picked up automatically.

Acceptance: the workflow file passes `actionlint`; a dry read confirms a web-only change does not trigger it and an iOS-only change does not trigger the Docker build. The agent cannot observe the first run; say so in the PR.

### P0-A3 TestFlight release workflow

Copy the shape of `weather-client/.github/workflows/ios-release.yml`, replacing the Flutter steps with `xcodebuild archive` and `-exportArchive`.

- `.github/workflows/ios-release.yml`: triggered by the shared `v*.*.*` release tags and by `workflow_dispatch` with an optional version input. A first job on `ubuntu-latest` compares the tag with the previous `v*` tag and skips the build unless `ios/` changed. The `Release` workflow keeps tagging iOS-only merges (it ignores only `docs/**`). Same version validation, same secret presence check, same certificate import, same upload action, same clean-up step.
- Two provisioning profiles, one per target (app and extension). Secrets: `IOS_DISTRIBUTION_CERTIFICATE_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`, `IOS_APP_PROVISIONING_PROFILE_BASE64`, `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`.
- Runs on `xcode-27` with Xcode 27.2. Codemagic's `xcode-project use-profiles` reads the project with the `xcodeproj` gem, which looks for `project.pbxproj`; the Xcode 27 format has `project.xcproj` instead, so signing settings are passed to `xcodebuild` and written to the export options directly.
- Fail early if either profile is for the wrong bundle ID or lacks the App Group, or the app's profile lacks FinanceKit. The extension's FinanceKit is a warning until P0-H4 is granted, then required. Phase 10 adds a production-push check for the app profile.
- Marketing version from the tag; build number from the run number and attempt, as weather-client does.
- The `Docker` workflow also builds the web image on every `v*` tag, including ones cut for iOS-only merges; that is accepted.
- `docs/ios-release.md`, adapted from weather-client's: the secrets and how to produce each, how to tag, where the build appears.

Acceptance: `actionlint` passes; the differences from weather-client's workflow are listed in the PR and are limited to Flutter removal, the second profile, the skip when `ios/` is unchanged, the entitlement check, the runner, and signing without Codemagic.

### P0-X1 Local-build mode in budget-stack

Repo: `../budget-stack`.

- `compose.local.yaml`: an override giving `budget-server` and `web` a `build:` context at the sibling checkouts (`../budget-server`, `../budget`) and a `:local` image tag.
- Make targets `start-local` (build, then start with the override) and `rebuild-local` (`make rebuild-local s=budget-server`). The Go image builds with `-mod=vendor`, so the target runs `go mod vendor` first. A missing sibling checkout fails with a message naming the path.
- `README.md`: a "Developing across repos" section, including that the iOS Simulator reaches the stack at `http://localhost:8080/api`.
- Replace `docs/apple-sync-plan.md` with a pointer to `budget/docs/plan/README.md`, and commit it (it is currently untracked).

Acceptance: `docker compose config` validates with and without the override; `make start-local` runs both services from local source and a visible change shows up after `make rebuild-local`.

### P0-H3 Human: Signing secrets and first TestFlight build

1. Create the distribution certificate and the two App Store profiles; add the seven secrets from `docs/ios-release.md`.
2. Merge the PRs and confirm the `iOS` workflow is green. Merging the first PR that changes `ios/` makes `Release` cut the next `v*` tag, which starts the first TestFlight build (or dispatch **iOS Release** by hand).
3. Install the build from TestFlight on each phone.

The app needs an AppIcon in its asset catalog before the first upload.

### P0-H4 Human: FinanceKit for the extension

1. Request the FinanceKit entitlement for `net.carsonnetworks.OpenPersonalFinance.Delivery` (Account Holder) and answer Apple's follow-up questions.
2. When granted: enable it on the App ID, regenerate the extension's profile and update `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64`, then tell the agent so it adds the entitlement to the extension target and makes the release check strict.

This does not block the phase 0 exit check. It blocks P1-A4's FinanceKit read, phase 2's background-delivery test and phase 7.

## Exit check

- A branch push touching only `ios/` runs the iOS workflow and nothing else; a web-only push does not run it.
- The first `v*` tag after the iOS PRs merge produces a TestFlight build that installs and shows that version; a later web-only tag skips the iOS build.
- The installed build's entitlements include the App Group on both targets and FinanceKit on the app (Settings shows the app under Privacy → Wallet once it asks, in phase 1; for now check the archive's entitlements in the workflow log).
- `make start-local` in budget-stack works and the web app behaves as before.
