# Phase 0: setup

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Next: [Phase 1](phase-1-financekit-read.md)

Read the working rules before starting any task here.

**Depends on:** Nothing. P0-X1 is independent of the other tasks here. See [Parallel work](README.md#parallel-work).

**Outcome:** an empty `OpenPersonalFinance` app with its extension and package builds, lints and tests in CI, reaches TestFlight from a tag, and is installed on the phones. budget-stack can run local builds. The app does nothing but show its version.

## Progress

Change `[ ]` to `[x]` when a task's PR is merged, or for human tasks when the step is done.

| Done | Task | What | Repo | Who |
|---|---|---|---|---|
| [x] | P0-H1 | Apple identifiers and capabilities | — | Human |
| [x] | P0-H2 | Create the Xcode project from templates | budget | Human |
| [x] | P0-A1 | Project skeleton | budget | Agent |
| [x] | P0-A2 | CI for `ios/` | budget | Agent |
| [x] | P0-A3 | TestFlight release workflow | budget | Agent |
| [x] | P0-X1 | Local-build mode in budget-stack | budget-stack | Agent |
| [x] | P0-H3 | Signing secrets and first TestFlight build | — | Human |
| [x] | P0-H4 | FinanceKit for the extension | — | Human |
| [x] | — | Exit check passed | — | Human |

## Layout

```
ios/
  OpenPersonalFinance.xcodeproj   # committed; Xcode 27 format (project.xcproj), folder-synchronized groups, shared scheme
  Makefile                        # help, format, lint, build, test; proto-generate added in phase 3
  mise.toml                       # pins actionlint; swift-format comes with Xcode 27.2
  .swift-format
  OpenPersonalFinance/            # app target: SwiftUI views, app entry, entitlements
  OpenPersonalFinanceDelivery/    # FinanceKit background delivery extension target
  OpenPersonalFinanceKit/         # local Swift package: all logic and tests
    Sources/OpenPersonalFinanceKit/
    Tests/OpenPersonalFinanceKitTests/
  buf.gen.yaml                    # added in phase 3
.github/
  workflows/ios.yml               # P0-A2
  workflows/ios-release.yml       # P0-A3
  actionlint.yaml                 # declares the xcode-27 preview runner labels
docs/
  plan/                           # this plan
  ios-release.md                  # added in P0-A3
```

## Tasks

### P0-H1 Human: Apple identifiers and capabilities

1. Register two App IDs: `net.carsonnetworks.OpenPersonalFinance` for the app and `net.carsonnetworks.OpenPersonalFinance.Delivery` for the extension. Enable **App Groups** on both with one shared group, `group.net.carsonnetworks.OpenPersonalFinance`, and **FinanceKit** (a managed capability, under Additional Capabilities) on the app. FinanceKit is granted per bundle ID, so the extension's is requested separately and enabled once granted (P0-H4).
2. Create the App Store Connect app record and add the phones' Apple IDs as internal testers.
3. Tell the agent the team ID. It is not secret.

### P0-H2 Human: Create the Xcode project from templates

Xcode's templates set up the extension correctly, so this is done by hand once, about five minutes. No project generator is used.

1. In Xcode 27: File → New → Project → **iOS** → App (not Multiplatform). Name `OpenPersonalFinance`, bundle ID `net.carsonnetworks.OpenPersonalFinance`, SwiftUI, Swift Testing, saved in `ios/`.
2. File → New → Target → **Background Delivery Extension**, named `OpenPersonalFinanceDelivery`, bundle ID `net.carsonnetworks.OpenPersonalFinance.Delivery`.
3. Signing & Capabilities: **App Groups** with `group.net.carsonnetworks.OpenPersonalFinance` on both targets; **FinanceKit** on the app, and on the extension once P0-H4 is granted.
4. Set both targets to iPhone only, iOS 27.
5. Commit the result on a branch and hand it to the agent. Do not add `xcuserdata`.

### P0-A1 Project skeleton

Starts from the branch P0-H2 produced.

- Add the local package `ios/OpenPersonalFinanceKit` and link it from both targets. Swift 6 language mode and strict concurrency on the package and both targets.
- Confirm, and fix if needed: both targets use folder-synchronized groups, are iPhone only on iOS 27, carry the App Group entitlement, and the app carries FinanceKit. Add `NSFinancialDataUsageDescription` to the app's Info.plist. A shared scheme is committed so CI can build it.
- App: one SwiftUI screen showing the app name, version and build. Extension: the template's empty `BackgroundDeliveryExtension` implementation, doing nothing.
- `OpenPersonalFinanceKit`: one placeholder type with one Swift Testing test, so the test pipeline has something to run.
- `ios/Makefile`: `format` and `lint` (`xcrun swift-format` from Xcode 27.2, config committed; `lint` also runs actionlint on the iOS workflows), `build`, `test`, `help`. `ios/mise.toml` pins actionlint. `test` builds the app, then runs the package's own `OpenPersonalFinanceKit` scheme on the first iOS 27 iPhone Simulator, because the project's scheme cannot see the package's tests.
- A placeholder app icon (App Store Connect rejects uploads without one).
- `.gitignore`: `DerivedData`, `xcuserdata`. The `.xcodeproj` itself is committed.
- Root `README.md`: a short "iOS app" section pointing at `ios/` and this plan.

Acceptance: from a clean checkout, `make -C ios test` passes on this Mac; `make -C ios lint` is clean; the app launches in the Simulator; the web checks (`pnpm lint`, `pnpm test`, `pnpm build`) are unaffected.

### P0-A2 CI for `ios/`

- New workflow `.github/workflows/ios.yml`: on branch pushes that change `ios/**`, `ios.yml`, `ios-release.yml` or `.github/actionlint.yaml`, on the `xcode-27` runner with Xcode 27.2 selected and tools from `ios/mise.toml`: lint, build and test on a Simulator, with no code signing. `.github/actionlint.yaml` lists `xcode-27` and `xcode-27-xlarge`, which actionlint does not know yet.
- Add `paths-ignore` for `ios/**` and `docs/**` to the existing web `CI`, `Docker` and `Proto codegen` workflows so an iOS-only change does not rebuild the web image. Tag pushes must still build the image; `CI` and `Proto codegen` run on branches and `v*` tags only.
- Add the Swift package and the new workflow's actions to `renovate.json` coverage if they are not picked up automatically.

Acceptance: the workflow file passes `actionlint`; a dry read confirms a web-only change does not trigger it and an iOS-only change does not trigger the Docker build. The agent cannot observe the first run; say so in the PR.

### P0-A3 TestFlight release workflow

Copy the shape of `weather-client/.github/workflows/ios-release.yml`, replacing the Flutter steps with `xcodebuild archive` and `-exportArchive`.

- `.github/workflows/ios-release.yml`: triggered by the shared `v*.*.*` release tags and by `workflow_dispatch` with an optional version input. A first job on `ubuntu-latest` compares the tag with the previous `v*` tag and skips the build unless `ios/` changed. The `Release` workflow keeps tagging iOS-only merges (it ignores only `docs/**`). Same version validation, same secret presence check, same certificate import, same upload action, same clean-up step.
- Two provisioning profiles, one per target (app and extension). Secrets: `IOS_DISTRIBUTION_CERTIFICATE_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`, `IOS_APP_PROVISIONING_PROFILE_BASE64`, `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`.
- Runs on `xcode-27` with Xcode 27.2. Codemagic's `xcode-project use-profiles` reads the project with the `xcodeproj` gem, which looks for `project.pbxproj`; the Xcode 27 format has `project.xcproj` instead, so signing settings are passed to `xcodebuild` and written to the export options directly.
- Fail early if either profile is for the wrong bundle ID or lacks the App Group, or the app's profile lacks FinanceKit. The extension's profile must also carry FinanceKit (`REQUIRE_EXTENSION_FINANCEKIT`). Phase 10 adds a production-push check for the app profile.
- Marketing version from the tag; build number from the run number and attempt, as weather-client does. A manual run without a version uses the latest `v*` tag, since the project's `MARKETING_VERSION` stays at 0.1.0 and App Store Connect rejects a lower version than one already uploaded.
- The `Docker` workflow also builds the web image on every `v*` tag, including ones cut for iOS-only merges; that is accepted.
- `docs/ios-release.md`, adapted from weather-client's: the secrets and how to produce each, how to tag, where the build appears.

Acceptance: `actionlint` passes; the differences from weather-client's workflow are listed in the PR and are limited to Flutter removal, the second profile, the skip when `ios/` is unchanged, the entitlement check, the runner, and signing without Codemagic.

### P0-X1 Local-build mode in budget-stack

Repo: `../budget-stack`.

- `compose.yaml` profiles: `release` runs the pinned `web` and `budget-server` images; `local` runs `web-local` and `budget-server-local`, built from the sibling checkouts (`../budget`, `../budget-server`) with network aliases so `edge` reaches them by the same names. Postgres and `edge` are shared.
- Make targets `start` and `start-local`, each stopping the other profile's services first. `start-local` rebuilds on every run, so it is also how a change is picked up.
- `README.md`: a "Developing across repos" section, including that the iOS Simulator reaches the stack at `http://localhost:8080/api`.

Acceptance: `docker compose config` validates for both profiles; `make start-local` runs both services from local source, a visible change shows up after rerunning it, and `make start` switches back.

budget-server's image downloads its own Go modules, so `start-local` needs nothing installed beyond Docker.

### P0-H3 Human: Signing secrets and first TestFlight build

1. Create the distribution certificate and the two App Store profiles; add the seven secrets from `docs/ios-release.md`.
2. Merge the PRs and confirm the `iOS` workflow is green. Merging the first PR that changes `ios/` makes `Release` cut the next `v*` tag, which starts the first TestFlight build (or dispatch **iOS Release** by hand).
3. Install the build from TestFlight on each phone.

### P0-H4 Human: FinanceKit for the extension

1. Request the FinanceKit entitlement for `net.carsonnetworks.OpenPersonalFinance.Delivery` (Account Holder); Apple grants it per bundle ID, separately from the app's.
2. Enable it on the App ID, regenerate the extension's App Store profile and update `IOS_EXTENSION_PROVISIONING_PROFILE_BASE64`.

The extension can only be embedded once it has FinanceKit: App Store Connect rejects a build whose background delivery extension lacks it (ITMS-91154).

## Exit check

- A branch push touching only `ios/` runs the iOS workflow and nothing else; a web-only push does not run it.
- The first `v*` tag after the iOS PRs merge produces a TestFlight build that installs and shows that version; a later web-only tag skips the iOS build.
- The installed build's app and extension both carry FinanceKit and the App Group (Settings shows the app under Privacy → Wallet once it asks, in phase 1; for now check the archive's entitlements in the workflow log).
- `make start-local` in budget-stack works and the web app behaves as before.
