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

- **Everything testable lives in `OpenPersonalFinanceKit`.** The app and extension targets hold only SwiftUI views, the extension entry point and wiring. Views get view models from the package; they never import FinanceKit or the generated Connect code.
- **FinanceKit is behind `FinanceDataSource`.** Only `FinanceKitDataSource` imports FinanceKit. Tests and the Simulator use `FakeFinanceDataSource`, driven by JSON fixtures.
- **The server is behind `BudgetAPI`.** Only its Connect implementation imports generated code. Tests use a fake.
- **Mapping is pure.** FinanceKit value → wire message conversions are plain functions with unit tests, in one module.
- **One `SyncEngine` actor** runs every sync, whatever triggered it. The app and extension coordinate through a file lock in the App Group.
- Swift 6 language mode with strict concurrency. Swift Testing for unit tests. No third-party dependencies beyond `connect-swift` and `swift-protobuf` without asking.
- Xcode 27.2 locally and in CI. The Xcode project (`ios/OpenPersonalFinance.xcodeproj`, Xcode 27 format) is committed and uses folder-synchronized groups, so adding a source file does not touch the project file. No project generator. Change targets, capabilities and build settings only when a task says to, and keep such changes in their own commit. Generated Connect/protobuf Swift is committed, as the web's generated code is.
- The Xcode 27 project format (`project.xcproj`, JSON) is undocumented. The local package is declared in the top-level `packages` list (`{ "kind": "local", "path": "OpenPersonalFinanceKit" }`) and linked per target with `package-product-members` → `{ "product-name": "OpenPersonalFinanceKit", "build-phase": { "build-phase": "frameworks" } }`. Unknown keys are silently ignored, so check any hand edit with a build. Third-party packages (`connect-swift`, `swift-protobuf`) go in `OpenPersonalFinanceKit/Package.swift`, not the project.
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
- **App side:** `FinanceDataSource` and the fixture format are fixed in phase 1 and corrected against real devices in phase 2.

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
