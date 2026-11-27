# Working rules

Rules for the implementing agent. They apply to every task in every phase. Back to the [overview](README.md).

Each phase ends with something a person can see working. Phases are not strictly sequential: each phase file has a **Depends on** line, and the overview's [Parallel work](README.md#parallel-work) section shows which tracks can run together. Do not start a task until the tasks it depends on are merged, and where it needs a server release, released.

## Systems

| Key | Repo | Local path | What changes there |
|---|---|---|---|
| **A** | `carson-networks/budget` | `ios/` in this repo | The iOS app, its extension and `OpenPersonalFinanceKit` |
| **S** | `carson-networks/budget-server` | `../budget-server` | Sync type, `FinanceKitService`, storage, API key tool, APNs sender |
| **W** | `carson-networks/budget` | `src/` in this repo | Web UI |
| **X** | `carson-networks/budget-stack`, `carson-networks/infra-prod` | `../budget-stack`, `../infra-prod` | Compose, local builds, version pins |

Task IDs are `P<phase>-<system><n>`; human tasks use `H`. Within one system (A, S, W or X), do a phase's tasks in the order its progress table lists them. Tasks for different systems in the same phase may run in parallel unless the task says it needs another.

## Who does what

- **Agent** tasks are everything not marked otherwise.
- **Human** tasks need a physical iPhone, the Apple Developer account, signing material, GitHub secrets, or production access. Do not attempt them. Prepare whatever they need (files, exact commands, a checklist), then stop and report.
- A phase's exit check is always run by the human, after releasing and deploying that phase. Finish all agent tasks, summarise what to test, and stop.

## Rules for every task

- One branch and one PR per task per repo, branched from that repo's default branch. Never push to a default branch, never merge, never tag a release.
- Never commit keys, certificates, provisioning profiles, API keys or `.env` values. Never log an API key or its hash.
- Financial data stays out of logs at info level: counts and IDs only, no merchant names or amounts. Fixtures captured from a real phone are redacted before they are committed.
- Do not copy code from the LunchSync repository; it has no licence. Reading it for ideas is fine.
- Comments: one-line "why" only, no long explanatory blocks.
- **Add API with its caller.** A task adds only the types, methods, enum cases, fields and conformances (`Codable`, `Hashable`, ...) that its own code or the next task's code calls, so a reviewer can see each one used. A test counts as a caller when it tests other code, such as a fake's hook used by a model's tests; a test written only for the new API does not. When the caller is the next task, the PR names it. Generated code and the server proto are exempt (see [Fixed shapes](#fixed-shapes)).
- Do not weaken or delete an existing test to make a change pass.
- **Keep the progress tables current as you go.** Each phase file opens with one. Tick an agent task's row once its PR is merged, and a human task's row once the human says it's done, in the next change you make to the plan (or a small docs PR if nothing else is pending). When the human reports a phase's exit check passed, tick its row in the overview's phase table too. Check off only what is confirmed: a PR still open, or a human step you only assume happened, stays unticked. If a task needs splitting or a new task appears, add a row and say so in the PR.
- A task is done when its acceptance items hold and the repo's checks pass. Paste the check output in the PR description. If a check cannot be run, say so; do not claim it passed.
- Stop and ask instead of guessing when: a task conflicts with the contract or README, an existing behaviour would have to change for Plaid or manual accounts, a migration would touch existing rows, or a FinanceKit API does not behave as the contract says.

## Repo checks

| Area | Run before opening a PR | Conventions |
|---|---|---|
| iOS (`ios/`) | `make -C ios format`, `make -C ios lint` (needs actionlint: `mise install` in `ios/`), `make -C ios test` (Simulator), then run the app in the Simulator against budget-stack with the fake data source | See "iOS conventions" below and [ios/best-practices.md](../../ios/best-practices.md). |
| budget-server | `make format`, `go test ./...`, then `make start-local` in budget-stack and exercise the change there | `plan/dev-rules.md`. Build with docker, not `go run`. After storage interface changes: `make generate-mocks`. After migrations: `make migrate` then `make generate`. After proto changes: `make proto-generate`. No message argument on `assert`/`require`. DB enums are explicit integers, never `iota`. |
| Web (`src/`) | `pnpm lint`, `pnpm test`, `pnpm build`, then `make start-local` in budget-stack and check the change in the browser | `spec/arch.md`. Server state only through `src/queries/`; only `src/connectRPC/` imports generated code; logic in pure functions with unit tests. |

## iOS conventions

Code structure and style are in [ios/best-practices.md](../../ios/best-practices.md). The points below are the ones every task is checked against.

- **Everything testable lives in `OpenPersonalFinanceKit`, one target per concern** (`Domain`, `FinanceKitSource`, `BudgetClient`, `Storage`, `Sync`, `Live`, `Features`, `Fakes`; see the best practices for what each holds and may depend on). The app and extension targets hold only SwiftUI views, entry points, system registrations and wiring. Views get screen models from `Features`.
- **FinanceKit is behind `FinanceDataSource` and `BackgroundDeliveryControl`.** Only the `FinanceKitSource` target imports FinanceKit, plus the extension entry point for its base class; `make lint` checks this. Tests and the Simulator use the fakes in `Fakes`, driven by JSON fixtures.
- **Storage and the network stay out of screen models and Domain values.** Screen models depend on behaviour protocols (`WalletHistoryReading`, `SyncScheduling`, `ActivityReading`, `ServerConnecting`, `AccountLinking`, `SyncRunning`, `FinanceDataSource`), never on a `*Storing` protocol or `BudgetAPI`; the `Sync` service behind each one decides when stored state is read, saved, cleared or re-applied and when the server is called. `Domain` values are never `Codable` and never mirror a database row or wire message: each JSON file, SQLite table or exchange format gets private representations that look like the format (plain `Codable` structs with no hand-written coding code for JSON files, private row structs for GRDB tables), mapped to and from the `Domain` value where the format is read and written: fixture file structs in `Storage/FixtureFile/` (reading) and in the diagnostics export (writing), private row shapes in each `Storage` store, and generated messages in `BudgetClient`. Mappings are round-trip tested. `make lint` checks this. See "Storage and network boundaries" in the best practices.
- **The server is behind `BudgetAPI`.** Only the `BudgetClient` target imports Connect, SwiftProtobuf or generated code (`make lint` checks the imports), generated types are internal to it, and `ConnectError` never leaves it. `BudgetAPI` takes and returns `Domain` values named for what they mean (`ServerStatus`, `BudgetAccount`, `ChangeBatch`), not after RPC requests and responses. Only `Sync` services call it; `SyncTests` use `FakeBudgetAPI`.
- **Mapping is pure.** FinanceKit → wallet types in `FinanceKitSource`; wallet → server values in `Domain` (the contract's rules: sign, name fallback, status); server values ↔ generated messages in `BudgetClient` (every wire detail: field names, proto enums, decimal strings, timestamps). Each is plain functions with unit tests.
- **One `SyncEngine` actor** in `Sync` runs every sync, whatever triggered it. The app and extension build it from `Live` and coordinate through `SyncLease` in the shared App Group SQLite database.
- **Zero warnings.** Swift and Clang warnings are errors in the app, extension and package, and `make build` and `make test` fail on any other warning xcodebuild prints. Fix the cause; do not suppress or allowlist a warning without asking.
- Swift 6.4 (`// swift-tools-version: 6.4`, Swift 6 language mode with strict concurrency). Swift Testing for unit tests. No third-party dependencies beyond `GRDB.swift`, `connect-swift` and `swift-protobuf` without asking.
- Xcode 27.2 locally and in CI. The Xcode project (`ios/OpenPersonalFinance.xcodeproj`, Xcode 27 format) is committed and uses folder-synchronized groups, so adding a source file does not touch the project file. No project generator. Change targets, capabilities and build settings only when a task says to, and keep such changes in their own commit. Generated Connect/protobuf Swift is committed, as the web's generated code is.
- The Xcode 27 project format (`project.xcproj`, JSON) is undocumented. The local package is declared in the top-level `packages` list (`{ "kind": "local", "path": "OpenPersonalFinanceKit" }`) and linked per target with `package-product-members` → `{ "product-name": "<product>", "build-phase": { "build-phase": "frameworks" } }`: the app links `Features`, `Live` and `Fakes`, the extension links only `Live`. Unknown keys are silently ignored, so check any hand edit with a build. Third-party packages go in `OpenPersonalFinanceKit/Package.swift`, scoped to the target that uses them (`GRDB.swift` on `Storage`, `connect-swift` and `swift-protobuf` on `BudgetClient`), not the project.
- The endpoint must be `https`, except `localhost` in debug builds.

## Running and testing locally

- **budget-stack is the local environment.** Anything beyond unit tests is done with the whole stack up: Postgres, budget-server, the web app and the edge proxy.
- **Use local builds of what you changed.** `make start-local` in budget-stack builds `web` and `budget-server` from the sibling checkouts (rerun it after a change); `make start` switches back to the pinned releases.
- **The Simulator reaches the stack at `http://localhost:8080/api`** and uses the fake data source. FinanceKit returns nothing in the Simulator, so anything that needs real Wallet data is a human task.
- **Unit tests stay in their area** and must not need the stack or a device.
- **When a task spans repos,** check out each repo's branch side by side and run them together in the stack before opening any of the PRs. Say in each PR which branches of the other repos it was run against.
- **Record what you ran.** Each PR description lists the commands used and what was observed.

## Fixed shapes

- **budget-server side:** the whole `FinanceKitService`, including the push-token RPC that phase 10 implements, and every new field are defined in phase 3 from the [sync contract](sync-contract.md). The app and the web UI generate clients from budget-server's protos with buf, pinned to a release tag.
- **App side:** `FinanceDataSource` and the fixture format grow with their callers through phase 1, are corrected against real devices in phase 2, and change only additively after that.

The proto is the one exception to adding API with its caller: it is a contract between repos, released and pinned by tag, so it is defined whole up front. The app's Swift API in front of it (`BudgetAPI` and the `Domain` values it exchanges) still grows with its callers, and is shaped by what the app needs rather than by the messages.

If a later task does need a shape or proto change, keep it additive, say so at the top of the PR, and for protos expect a new budget-server tag and a repin before dependent tasks can merge.

## Releases and deploys

Every phase ends with the human merging its PRs, tagging releases (`vX.Y.Z` in budget-server; in this repo the `Release` workflow's `vX.Y.Z` tag covers both the web image and, when `ios/` changed, the app), bumping pinned versions in budget-stack and production, and installing the TestFlight build. This is implied and not listed as a task. Deploy the server before installing an app build that depends on it.

## Patterns to follow

| Need | Copy the shape of |
|---|---|
| Sync provider | `budget-server/internal/sync/providers/plaid.go`, registered in `main.go` |
| Action + test | `budget-server/internal/operator/actions/plaid_add_transaction.go` and its `_test.go` |
| Connect handler | `budget-server/internal/connecthandlers/v1/plaid/`, registered in `api/connect.go` |
| Storage reader/writer | `budget-server/internal/storage/plaid/` |
| Migration | `budget-server/scripts/db_migrations/migrations/000005_add_plaid_tables.*.sql` |
| iOS signing and TestFlight upload | `.github/workflows/ios-release.yml` and `docs/ios-release.md` in this repo |
| Web query module and form logic | `src/queries/accounts.ts`, `src/components/Account/accountForm.ts` |
