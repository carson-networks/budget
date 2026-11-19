# iOS best practices

How Swift code in `ios/` is structured and written. Process rules (branches, PRs, checks, task order) live in [docs/plan/working-rules.md](../docs/plan/working-rules.md); where the two overlap, they agree.

## Status

`OpenPersonalFinanceKit` still has a single target holding `AppVersion`. Split it into the targets below before any phase 1 code lands; `AppVersion` moves to `Domain`. Changing the package's products also changes `package-product-members` in `project.xcproj`, which goes in its own commit.

## Layout

```
ios/
  OpenPersonalFinance/                 app target: SwiftUI views and composition only
    OpenPersonalFinanceApp.swift       @main; builds Dependencies and the root models, injects them
    Features/<Feature>/                one folder per screen or flow: Settings, Accounts, Diagnostics, SyncStatus
    Components/                        small reusable views (MoneyText, StatusBadge)
    Assets.xcassets
  OpenPersonalFinanceDelivery/
    OpenPersonalFinanceDelivery.swift  entry point only: build Dependencies, run the engine, cancel on willTerminate
  OpenPersonalFinanceKit/
    Package.swift
    Sources/<Target>/
    Tests/<Target>Tests/
```

Group by feature, not by kind. There are no top-level `Views/`, `ViewModels/` or `Models/` folders. The project uses folder-synchronized groups, so the folder on disk is the group in Xcode and adding a file never touches the project.

## Package targets

Each rule in the working rules about who may import what is enforced by a target boundary, so the compiler rejects a bad import.

| Target | Holds | Depends on |
|---|---|---|
| `Domain` | Value types (`WalletAccount`, `WalletTransaction`, `Money`, `SyncTrigger`, `AppVersion`), domain errors, the `FinanceDataSource` and `BudgetAPI` protocols, pure mapping functions. Foundation only. | nothing |
| `FinanceKitSource` | `FinanceKitDataSource`. The only target that imports FinanceKit. | `Domain` |
| `BudgetClient` | `ConnectBudgetAPI` and `Gen/`. The only target that imports Connect or SwiftProtobuf. | `Domain`, `connect-swift`, `swift-protobuf` |
| `Storage` | App Group file stores (tokens, outbox, run log), the file lock, `SettingsStore` (Keychain). | `Domain` |
| `Sync` | `SyncEngine` actor. Talks to sources, the API and storage only through protocols. | `Domain`, `Storage` |
| `Live` | `Dependencies` and `Dependencies.live(...)`: the one place real implementations are wired together. | `Sync`, `Storage`, `FinanceKitSource`, `BudgetClient` |
| `Features` | `@Observable` screen models. `MainActor` by default. | `Domain`, `Sync`, `Storage` |
| `Fakes` | `FakeFinanceDataSource`, `FakeBudgetAPI`, JSON fixtures as resources. Used by tests, previews and the Simulator. | `Domain` |

```
App target  ──► Features, Live, Fakes
Extension   ──► Live
Features ──► Sync ──► Storage ──► Domain
Live ──► Sync, Storage, FinanceKitSource, BudgetClient ──► Domain
Fakes ──► Domain
```

- Dependencies only point down this graph. Nothing depends on `Live` except the two entry points.
- The extension never links `Features` or SwiftUI.
- The extension imports FinanceKit only for `BackgroundDeliveryExtension` and `FinanceStore.BackgroundDataType`; its body calls `Live` and nothing else.
- Generated protobuf and Connect code is generated with `Visibility=Internal`, so wire types cannot leave `BudgetClient`.
- Use `package` access for what targets share inside the package and `public` only for what the app or extension calls.
- Each test target depends on the target under test and `Fakes`, nothing else.

## Concurrency

- Swift 6 language mode, strict concurrency. Every target enables the `NonisolatedNonsendingByDefault` and `InferIsolatedConformances` upcoming features. `Features` also sets `.defaultIsolation(MainActor.self)`, as does the app target.
- Shared mutable state lives in an `actor` (`SyncEngine`, each file store). No locks, `DispatchQueue` or `@unchecked Sendable` to silence the compiler.
- Mark CPU-heavy functions that must leave the caller's actor `@concurrent`. Do not use `Task.detached` for that.
- Long work checks `Task.isCancelled` at each batch boundary, and cancellation leaves tokens and the outbox consistent.
- No Combine in new code. Use `async`/`await`, `AsyncStream`, and `Observations` to observe `@Observable` state outside SwiftUI.

## Composition and dependency injection

- The entry points are the composition roots. `OpenPersonalFinanceApp` calls `Dependencies.live(...)`, passing `FakeFinanceDataSource` in the Simulator, then builds the long-lived screen models once and injects them with `.environment(_:)`. The extension calls `Dependencies.live()`, runs the engine in a stored `Task`, and cancels it in `willTerminate()`.
- Below the roots, dependencies arrive through `init` parameters typed as protocols (`any FinanceDataSource`, `any BudgetAPI`).
- No singletons, `static let shared`, service locators or DI frameworks.

## Views and screen models

- A screen model is an `@Observable final class` in `Features`. It owns the screen's state and every action: loading, validation, formatting decisions, error mapping. Its properties are `public private(set)`; the view changes state only through methods.
- Long-lived models (accounts, settings, sync status) are created in the composition root and read with `@Environment(AccountsModel.self)`. State that belongs to one view (a text field, a sheet flag) is `@State private var`. A child given a model by its parent takes it as a plain property, or `@Bindable` when it needs bindings.
- Views only lay out and bind. Closures in `Button`, `.task` and `.onChange` are one-line calls into the model.
- Load with `.task { await model.load() }`, never `onAppear`, so loading is cancelled when the view goes away.
- Split a view when its file passes ~150 lines or its `body` branches on anything beyond display. Extract subviews as structs, not `@ViewBuilder` helper functions.
- Every view file has a `#Preview` built from `Fakes`.
- Navigation is a `NavigationStack` with value-based `navigationDestination(for:)`.
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
    AccountsView().environment(AccountsModel(source: FakeFinanceDataSource.sample))
}
```

## Networking

- `BudgetAPI` takes and returns `Domain` types. `ConnectBudgetAPI` converts to and from generated messages inside `BudgetClient`.
- Errors are mapped at that boundary into `BudgetAPIError` (`unauthorized`, `unreachable`, `server(code:)`, ...). Nothing outside `BudgetClient` sees a `ConnectError`.
- The endpoint is `https`, except `localhost` in debug builds. The key goes in the `Authorization: Bearer` header and nowhere else.
- `BudgetClientTests` checks request bodies against captured JSON so drift from the web client shows up as a test failure.

## Storage

- One `actor` per file. Files are `Codable`, written with `Data.write(to:options: .atomic)`.
- All paths come from one `AppGroupDirectory` value so tests point it at a temporary directory.
- The extension runs while the phone is locked. Keychain items use `kSecAttrAccessibleAfterFirstUnlock`, never the `WhenUnlocked` default, and App Group files never use `.completeFileProtection`. A "locked" failure from FinanceKit means retry later, not an error.
- The API key lives only in the Keychain access group shared with the extension: never `UserDefaults`, files, logs or the run log.

## Errors

- Each target has a small error enum for what its callers can act on, mapped at the boundary where a lower-level error enters.
- Typed throws (`throws(SyncError)`) on the engine's public API is fine; plain `throws` elsewhere.
- No `try!`, `fatalError` for recoverable states, or force unwraps (swift-format enforces the last two).

## Logging

- `os.Logger`, subsystem `net.carsonnetworks.OpenPersonalFinance`, one category per target.
- Interpolations state their privacy. Counts, IDs and states are `.public`; anything describing money or merchants is `.private` and does not belong at info level at all.

## Testing

- Swift Testing (`@Test`, `#expect`, `#require`), with parameterized tests for mapping tables.
- Hand-written fakes from `Fakes`; no mocking libraries.
- Test `Domain` mapping, `Storage`, `Sync`, `BudgetClient` encoding and `Features` models. SwiftUI views are covered by previews and the Simulator, not unit tests. `FinanceKitSource` is covered by the phone test.

## Files and style

- One primary type per file, named after it. Extensions that add a concern go in `Type+Concern.swift` (`WalletTransaction+Wire.swift`).
- `make format` and `make lint` must pass; `.swift-format` is the style source of truth.
- Comments are one-line "why" only.
- No third-party dependencies beyond `connect-swift` and `swift-protobuf` without asking.

## Not used here

The Composable Architecture, VIPER, coordinators, use-case classes, SwiftData and Core Data. The package targets, protocols and `@Observable` models above already give the separation and testability those exist for.
