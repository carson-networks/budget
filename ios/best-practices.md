# iOS best practices

How Swift code in `ios/` is structured and written. Process rules (branches, PRs, checks, task order) live in [docs/plan/working-rules.md](../docs/plan/working-rules.md); where the two overlap, they agree.

## Layout

```
ios/
  OpenPersonalFinance/                 app target: SwiftUI views and composition only
    OpenPersonalFinanceApp.swift       @main; builds Dependencies and the root models, injects them
    Features/<Feature>/                one folder per screen or flow: Settings, Accounts, Diagnostics, SyncStatus
    Components/                        small reusable views (MoneyText, StatusBadge)
    Assets.xcassets
  OpenPersonalFinanceDelivery/
    OpenPersonalFinanceDelivery.swift  entry point only: build Dependencies, run the engine, cancel and await shutdown on willTerminate
  OpenPersonalFinanceKit/
    Package.swift
    Sources/<Target>/
    Tests/<Target>Tests/
```

Group by feature, not by kind. There are no top-level `Views/`, `ViewModels/` or `Models/` folders. The project uses folder-synchronized groups, so the folder on disk is the group in Xcode and adding a file never touches the project.

## Package targets

Each rule in the working rules about who may import what is a target boundary, so the compiler rejects an import of a package module the target does not depend on.

| Target | Holds | Depends on |
|---|---|---|
| `Domain` | Value types (`WalletAccount`, `WalletBalance`, `WalletTransaction`, `ChangeSet`, `SyncTrigger`, `SyncFrequency`, `AppVersion`), values exchanged with the server, domain errors, protocols (`FinanceDataSource`, `WalletHistoryReading`, `BackgroundDeliveryControl`, `BudgetAPI`, `StaleNotifier`, `TokenStoring`, `SettingsStoring`, `LogStoring`, `SyncRunning`), the fixture value (`WalletFixture`), and pure functions: chronological `ChangeSet` coalescing, wallet → request mapping, URL validation, redaction, schedule and throttle calculations. Foundation only. | nothing |
| `FinanceKitSource` | `FinanceKitDataSource` and `FinanceKitBackgroundDelivery`, with the FinanceKit → wallet type mapping. The only target that imports FinanceKit. | `Domain` |
| `BudgetClient` | `ConnectBudgetAPI`, `Domain` values ↔ generated message conversion, and `Gen/`. The only target that imports Connect or SwiftProtobuf. | `Domain`, `connect-swift`, `swift-protobuf` |
| `Storage` | App Group file stores (tokens, run log, wake log), the fixture file reader (`FixtureFile/`), the file lock, `SettingsStore` (Keychain). Conforms to `Domain` storage protocols. | `Domain` |
| `Sync` | `SyncEngine` actor, the background work around it (wake probe, live monitor and debounce, push registration), and the services screens use, such as `WalletHistoryReader`. Conforms to `SyncRunning` and reaches FinanceKit and the server only through `Domain` protocols. | `Domain`, `Storage` |
| `Live` | `Dependencies` and `Dependencies.live(...)`: the one place real implementations are wired together, plus thin system adapters such as the UserNotifications `StaleNotifier`. | `Domain`, `Sync`, `Storage`, `FinanceKitSource`, `BudgetClient` |
| `Features` | `@Observable` screen models, and the diagnostics export's own `Encodable` file structs. `MainActor` by default. Depends on `Domain` protocols only, never storage or `BudgetAPI`, keeping screen-model tests fully in-memory via `Fakes`. | `Domain` |
| `Fakes` | `FakeFinanceDataSource`, `FakeBackgroundDelivery`, `FakeBudgetAPI`, in-memory fakes for `Domain` storage/sync protocols, `FixtureFiles` (reads the bundled fixtures), and every JSON fixture (hand-written and phone exports) as resources. Used by tests, previews and the Simulator. | `Domain`, `Storage` |

```
App target  ──► Features, Live, Fakes
Extension   ──► Live
Features    ──► Domain
Sync        ──► Storage ──► Domain
Live        ──► Sync, Storage, FinanceKitSource, BudgetClient ──► Domain
Fakes       ──► Storage ──► Domain
```

- Dependencies only point down this graph. Nothing depends on `Live` except the two entry points.
- The extension never links `Features` or SwiftUI.
- Apple frameworks can be imported from any target, so the FinanceKit rule is also checked by `make lint`. The exceptions are `FinanceKitSourceTests`, and the extension entry point, which imports FinanceKit only for `BackgroundDeliveryExtension` and `FinanceStore.BackgroundDataType`; its body calls `Live` and nothing else.
- Generated protobuf and Connect code is generated with `Visibility=Internal`, so wire types cannot leave `BudgetClient`.
- Use `package` access for what targets share inside the package and `public` only for what the app or extension calls.
- Each test target depends on the target under test and `Fakes`, nothing else.

## Concurrency

- Swift 6.4 (`// swift-tools-version: 6.4` in `Package.swift`, Swift 6 language mode with strict concurrency). Every target enables the `NonisolatedNonsendingByDefault`, `InferIsolatedConformances` and `MemberImportVisibility` upcoming features (matching the Xcode targets). `Features` and the app target set default actor isolation to `MainActor`; the extension and all other package targets stay explicitly `nonisolated`.
- Shared mutable state lives in an `actor` (`SyncEngine`, each file store). No `NSLock`, `os_unfair_lock`, `DispatchQueue` or `@unchecked Sendable` to silence the compiler; `Synchronization.Mutex` is acceptable for tiny synchronous state (such as tracking active extension tasks).
- Mark CPU-heavy functions that must leave the caller's actor `@concurrent`. Do not use `Task.detached` for that.
- Long work checks `Task.isCancelled` at each batch boundary, and cancellation leaves saved tokens consistent. Use Swift 6.4 `async defer` (SE-0493) paired with `withTaskCancellationShield` (SE-0504) for deterministic async cleanup on exit or cancellation (releasing `FileLock`, flushing run/wake logs) rather than spawning unstructured cleanup tasks. Do not leave throwing `Task` values unhandled (Swift 6.4 warns on unused throwing tasks): store the handle or catch inside the task.
- No Combine in new code. Use `async`/`await`, `AsyncStream`, and `Observations` to observe `@Observable` state outside SwiftUI.

## Composition and dependency injection

- The entry points are the composition roots. `OpenPersonalFinanceApp` calls `Dependencies.live(...)`—selecting `FakeFinanceDataSource` only under `#if DEBUG || targetEnvironment(simulator)` so Release builds on a device always use FinanceKit—then builds the long-lived screen models once in `@State` and injects them with `.environment(_:)`. The extension calls `Dependencies.live()`, tracks active run task(s) (coalescing or serializing overlapping `didReceiveData(for:)` calls so a second wake never overwrites an in-flight handle), and in `willTerminate()` cancels active work and awaits its graceful completion (bounded by a short grace timeout) before returning so lock release and log writes finish cleanly.
- The app target also owns system registrations that need an app: `.backgroundTask(.appRefresh(...))` (scheduling with `BGTaskScheduler.shared.submit`), remote notifications (using the `async` delegate overload `application(_:didReceiveRemoteNotification:) async -> UIBackgroundFetchResult`), and scene phase. Each handler is a one-line call into package code.
- Below the roots, dependencies arrive through `init` parameters typed as protocols (`any FinanceDataSource`, `any WalletHistoryReading`, `any SyncRunning`).
- No singletons, `static let shared`, service locators or DI frameworks.

## Views and screen models

- A screen model is an `@Observable final class` in `Features`. It owns the screen's state and every action: loading, validation, formatting decisions, error mapping. Its properties are `public private(set)`; the view changes state only through methods.
- Long-lived models (accounts, settings, sync status) are owned in `@State` by the composition root and read with `@Environment(AccountsModel.self)`. State that belongs to one view (a text field, a sheet flag) is `@State private var`. A child given a model by its parent takes it as a plain property, or `@Bindable` when it needs bindings.
- Views only lay out and bind. Closures in `Button`, `.task` and `.onChange` are one-line calls into the model.
- Load with `.task { await model.load() }`, never `onAppear`, so loading is cancelled when the view goes away.
- Split a view when its file passes ~150 lines or its `body` branches on anything beyond display. Extract subviews as structs, not `@ViewBuilder` helper functions.
- Every view file has a `#Preview` built from `Fakes`.
- Use the `Tab` builder (not `.tabItem`), with a separate `NavigationStack` and value-based `navigationDestination(for:)` inside each tab—never wrap a `TabView` in a `NavigationStack`. Prefer standard SwiftUI system controls and Liquid Glass materials over custom chrome, and `FormatStyle` (`Decimal.formatted`, `Date.formatted`) over `NumberFormatter`/`DateFormatter`.
- **iOS 27 layout and chrome:** iOS 27 removes fixed-size compatibility modes for iPhone apps (iPhone Mirroring, iPad multitasking), so avoid fixed-width layout assumptions and adapt cleanly via `horizontalSizeClass`. Use `.appearsActive` to tone down custom status indicators when inactive, toolbar `.visibilityPriority(...)` where space is tight, and `swipeActionsContainer` if any ledger screen moves from `List` to a custom `ScrollView`/`LazyVStack`.
- **Title case for user-facing text:** navigation and screen titles, tab names, section headers, buttons, menu items, labels and picker options. Capitalize every word except articles, coordinating conjunctions and short prepositions, unless one comes first or last: "Try Again", "Wallet Access Off", "Read Again from Saved Token". Text written as full sentences (descriptions, messages, alert bodies) stays in sentence style.
- **Privacy in the UI:** Apply `.privacySensitive()` to balances, credit limits, and transaction rows so App Switcher snapshots (and any future widgets) redact financial data.
- No `ObservableObject`, `@Published`, `@StateObject`, `AnyView`, or `GeometryReader` as a layout workaround.

```swift
@Observable
public final class AccountsModel {
    public private(set) var accounts: [WalletAccount] = []
    public private(set) var failure: DataSourceError?
    private let source: any FinanceDataSource

    public init(source: any FinanceDataSource) { self.source = source }

    public func load() async {
        do { accounts = try await source.accounts() }
        catch { failure = DataSourceError(error) }
    }
}

struct AccountsView: View {
    @Environment(AccountsModel.self) private var model

    var body: some View {
        List(model.accounts) { AccountRow(account: $0) }
            .task { await model.load() }
    }
}

#Preview {
    AccountsView().environment(AccountsModel(source: FakeFinanceDataSource.sample()))
}
```

## Storage and network boundaries

`make lint` checks these.

- **Screen models never see storage or the network.** They depend on behaviour protocols such as `WalletHistoryReading`, never on a `*Storing` protocol or `BudgetAPI`. The `Sync` service behind the protocol decides when to read, save or call the server.
- **Domain values are never `Codable`.** Each file or network format gets plain `Codable` structs that match it, plus a mapping to and from the `Domain` value. Server values are named for what they mean (`ChangeBatch`), not after RPC messages.
- **Generated code stays in `BudgetClient`.** Only it imports Connect and SwiftProtobuf.

```swift
// A plain Codable struct that matches the file, mapped to and from the Domain value
struct FixtureTransaction: Codable {
    var amount: String   // as written in the file
    var status: String

    init(_ transaction: WalletTransaction) { ... }
    func toDomain() throws -> WalletTransaction { ... }
}
```

## Mapping

Data crosses these pure, unit-tested mapping steps, each in the one target that can see both sides:

| Step | Target |
|---|---|
| FinanceKit values → wallet types | `FinanceKitSource` |
| Chronological `ChangeSet` coalescing (deduplicating multi-chunk inserts/updates/deletes by ID) and wallet types → server values (the sync contract's mapping table: sign, name fallback, status) | `Domain` |
| `Codable` file structs ↔ `Domain` values | the target that owns the file |
| Server values ↔ generated messages (including decimal strings) | `BudgetClient` |

## Networking

- `BudgetAPI` takes and returns `Domain` types. `ConnectBudgetAPI` converts to and from generated messages inside `BudgetClient`. Only `Sync` services call it.
- Errors are mapped at that boundary into `BudgetAPIError` (`unauthorized`, `unreachable`, `server(code:)`, ...). Nothing outside `BudgetClient` sees a `ConnectError`.
- The endpoint is `https`, except `localhost` in debug builds. The key goes in the `Authorization: Bearer` header and nowhere else.
- `BudgetClientTests` checks request bodies against captured JSON so drift from the web client shows up as a test failure.

## Storage

- One `actor` per file. Each file is a private `Codable` struct mapped to and from `Domain` values, wrapped in a versioned envelope (`schemaVersion: Int`), and written with `Data.write(to:options: .atomic)`. Define corrupt or incompatible recovery per store: `RunLog` and `WakeLog` wipe and recreate cleanly with a warning; `TokenStore` clears affected tokens so the next sync recovers via full resync.
- All paths come from one `AppGroupDirectory` value so tests point it at a temporary directory.
- The cross-process `FileLock` uses an atomic lease file (`O_CREAT | O_EXCL` with a timestamp and stale-lock timeout), never a kernel `flock`/`fcntl` lock held across `await` calls—holding a kernel lock in an App Group container on suspension triggers iOS `0xdead10cc` termination, and blocking locks stall Swift's cooperative thread pool. `FileLock` supports `renew()` to extend its expiry between batches during long foreground runs (such as a full resync) while keeping the stale-lock TTL short (~45 s) after a crash, and is released inside `async defer` + `withTaskCancellationShield`. `SyncEngine` takes the lock non-blocking and exits if held; short shared-file appends such as `WakeLog` retry briefly with `Task.sleep` rather than dropping entries.
- The extension runs while the phone is locked. Keychain items use `kSecAttrAccessibleAfterFirstUnlock` (never the `WhenUnlocked` default, and intentionally not `ThisDeviceOnly` so encrypted device backups and phone upgrades carry the key over), and App Group files never use `.completeFileProtection`. A "locked" failure from FinanceKit means retry later, not an error.
- The API key lives only in the Keychain, shared with the extension by passing the App Group identifier (`group.net.carsonnetworks.OpenPersonalFinance`) as `kSecAttrAccessGroup` (included automatically by iOS, so no separate `keychain-access-groups` entitlement or Team ID prefix is needed): never `UserDefaults`, files, logs or the run log.

## Errors

- Each target has a small error enum for what its callers can act on, mapped at the boundary where a lower-level error enters.
- Typed throws (`throws(SyncError)`) on the engine's public API is fine; plain `throws` elsewhere.
- No `try!`, force unwraps, or `fatalError` for recoverable states (`swift-format` enforces the first two).

## Logging

- `os.Logger`, subsystem `net.carsonnetworks.OpenPersonalFinance`, one category per target, declared in that target's `Log.swift`.
- Interpolations state their privacy. Counts, IDs and states are `.public`; anything describing money or merchants is `.private` and does not belong at info level at all.

## Testing

- Swift Testing (`@Test`, `#expect`, `#require`), with parameterized tests for mapping tables.
- Hand-written fakes from `Fakes`; no mocking libraries.
- Test `Domain` mapping, `Storage`, `Sync`, `BudgetClient` encoding and `Features` models. SwiftUI views are covered by previews and the Simulator, not unit tests. In `FinanceKitSource`, enum, error and token mapping is unit-tested (FinanceKit's enums can be built in tests); struct mapping (`Account`, `AccountBalance`, `Transaction`, which have no public initializers) is covered by the phone test.

## Files and style

- One primary type per file, named after it. Extensions that add a concern go in `Type+Concern.swift` (`WalletTransaction+Wire.swift`).
- `make format` and `make lint` must pass; `.swift-format` is the style source of truth.
- Zero warnings. The project sets `SWIFT_TREAT_WARNINGS_AS_ERRORS` and `GCC_TREAT_WARNINGS_AS_ERRORS`, every package target uses `.treatAllWarnings(as: .error)`, and the Makefile fails `build` and `test` on any remaining `warning:` line (linker, asset catalog, build system). The only allowlisted line is the App Intents metadata notice, which Xcode prints for every target that does not link AppIntents. `make lint` runs `ast-grep scan --error`, so warning-level rules fail too.
- Add API with its caller: a task adds only what its own code or the next task calls, conformances included (see the working rules).
- Comments are one-line "why" only.
- No third-party dependencies beyond `connect-swift` and `swift-protobuf` without asking.

## Not used here

The Composable Architecture, VIPER, coordinators, use-case classes, SwiftData and Core Data. The package targets, protocols and `@Observable` models above already give the separation and testability those exist for.
