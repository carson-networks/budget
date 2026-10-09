# Frontend Architecture: Split Ownership

## Overview

The budget app uses a **split ownership** model for state management:

- **TanStack Query** owns all server state (data fetched from ConnectRPC services).
- **Zustand** owns all client state (UI preferences, selections, filters, modal state).
- **Local `useState`** owns ephemeral component state (form inputs, toggle flags scoped to one component).

These layers connect through TanStack Query's `queryKey` mechanism. When Zustand
state that drives a query changes, the query key changes, and TanStack Query
automatically refetches. No `useEffect` is needed to synchronize server data
into client stores.

## Guiding Principles

1. **Never copy server data into Zustand.** TanStack Query's cache is the single
   source of truth for anything that comes from a ConnectRPC service. Reading
   server data means calling `useQuery` / `useInfiniteQuery` with a factory from
   **`src/queries/`**, not subscribing to a Zustand store.
2. **Zustand stores are small and focused.** Each store covers one concern
   (filters, UI layout, a feature's client-side selections). Stores do not
   contain `async` actions that call RPCs.
3. **Queries and mutations are defined once, in `src/queries/`, as options
   objects, not hooks.** Each domain module exports `queryOptions` /
   `infiniteQueryOptions` factories and `mutationOptions` constants. Components
   pass them to `useQuery` / `useMutation`. Do not add a `useXxx` hook that only
   wraps one of these. See "Query Layer Conventions" below.
4. **Prefer query key composition over `useEffect`.** If a piece of client state
   should trigger a refetch, include it in the query key. TanStack Query handles
   the rest.
5. **Wire types stay in `connectRPC/gen/` and `connectRPC/types.ts`.** Only
   **`src/connectRPC/`** imports generated protobuf modules under **`connectRPC/gen/`**.
   **`src/queries/`** (and `src/plaid/`) call the **`connectRPC/`** clients and map
   responses with **`models/`**; nothing else touches the clients. Components get
   **`models/`** types and never see protobuf messages.
6. **`models/` is what client code imports for UI-facing model types.** Types, `map*`
   functions (wire → model), and pure helpers live under **`src/models/`**. Query
   factories map responses with them in `select`.
7. **Keep logic in pure functions, keep hooks thin.** Validation, request
   building, and view-data derivation are plain functions with plain unit tests
   (`accountForm.ts`, `categoryForm.ts`, `buildBudgetMonthData.ts`,
   `buildBudgetMatrixData.ts`). A component or hook calls the queries, calls the
   function, and renders.
8. **Colocate constants and utilities with the code that owns them.** Do not use a
   top-level `constants/` directory. Shared literals (enums, lookup tables,
   labels) live next to the components, queries, or **`models/`** modules that
   consume them. Small pure helpers live beside their primary caller; promote
   shared logic into **`models/`** when it is cross-cutting and not wire-specific.
   `src/utils/` holds only small, genuinely cross-feature helpers (`monthRange`,
   `nameById`); do not let it grow into a junk drawer.

## Project Structure

```
src/
  connectRPC/                   # Connect transport, clients, wire re-exports, codegen
    connect.ts                  # createConnectTransport + per-service createClient singletons
    types.ts                    # re-exports message types/schemas from gen/ for mappers
    runtime.ts                  # demo mode via URL `?mock=true` (isFakeDataMode)
    gen/                        # generated protobuf types + service descriptors (buf)

  models/                       # UI-facing models + wire→model mappers; imports connectRPC/ only
    account.ts, budget.ts, …    # types, enums, and map* for each area
    money.ts, timestamp.ts      # display / conversion helpers
    index.ts                    # re-exports types + map*
    *_test.ts                   # colocated model tests

  queries/                      # ALL server state: query/mutation option factories
    rpc.ts                      # rpc(call): rethrows any failure as Error(message)
    invalidate.ts               # invalidatesOnSettled(...keys) for mutationOptions
    optimistic.ts               # patchQueries(): snapshot + patch + rollback (use sparingly)
    register.ts                 # registers Error as TanStack's default error type
    accounts.ts                 # accountQueries.{all,list}, accountMutations.{createManual,update,delete}
    categories.ts               # categoryQueries.{all,list}, categoryMutations.{create,update}
    budgets.ts                  # budgetQueries.{all,range}, budgetMutations.set
    transactions.ts             # transactionQueries.{all,lists,list,totals}, transactionMutations.updateCategory
    *.test.tsx                  # mock connectRPC/connect.js and run the options through a QueryClient

  hooks/                        # Hooks that glue queries to React/router state (not plain wrappers)
    useTransactionsPager.ts     # page lives in the URL (?page=) + transactionQueries.list

  plaid/                        # Plaid Link: types, wire encoding, react-plaid-link flow
    usePlaidLinkToken.ts        # plaidLinkTokenQueryOptions + prefetchPlaidLinkToken
    useExchangePlaidToken.ts    # exchangePlaidTokenMutation (invalidates accounts)
    useConnectedAccountFlow.ts  # Link open + exchange; used from AccountsView

  persistence/                  # client-side storage adapters (typed disk slices)
  stores/                       # Zustand stores (client-only state): shell chrome + color scheme

  utils/                        # monthRange, nameById: small cross-feature pure helpers

  test/
    setup.ts                    # Vitest + RTL global setup
    renderWithProviders.tsx     # Mantine + QueryClient + MemoryRouter; createWrapper() for renderHook
    wire.ts                     # domain model -> wire shape for mocked RPC responses

  App.tsx, main.tsx, theme.ts, index.css

  components/                   # React components, feature folders with colocated tests
    AppShell/
    Account/
      accountForm.ts            # pure form values, validation, request builders (create + edit)
      AccountsView/, AccountTransactionsView/
      CreateManualAccountModal/, EditAccountModal/
    Category/
      categoryForm.ts           # same, for categories
      CategoriesView/, CreateCategoryModal/, EditCategoryModal/
    BudgetView/
      BudgetMonthView/          # buildBudgetMonthData.ts (pure) + useBudgetMonthData.ts (queries + memo)
      BudgetMatrixView/         # buildBudgetMatrixData.ts (pure) + useBudgetMatrixData.ts
    TransactionsView/
    shared/                     # cross-feature presentation primitives (shells, layout)
```

Feature folders such as **`components/Account/`** group screens and modals for one
domain; **`components/shared/`** holds Mantine shells used across routes.

## State Ownership Rules

### Server State (TanStack Query)

Anything returned by a ConnectRPC service is server state. The query cache owns
it, and components read it through the factories in `src/queries/`.

| Data                  | Read with                                              | Query key                                              |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Accounts              | `useInfiniteQuery(accountQueries.list())` → `Account[]`   | `["accounts", "list"]`                                 |
| Categories            | `useInfiniteQuery(categoryQueries.list())` → `Category[]` | `["categories", "list"]`                               |
| Budgets for a range   | `useQuery(budgetQueries.range(start, end))` → `Budget[]`  | `["budgets", "range", y, m, y, m]`                     |
| Transaction totals    | `useQuery(transactionQueries.totals(start, end))`         | `["transactions", "totals", y, m, y, m]`               |
| Transactions page     | `useTransactionsPager(filter, { enabled })`               | `["transactions", "list", { page, pageSize, ...filter }]` |

`all()` on each factory object is the key root used for invalidation. Totals
share the `["transactions"]` root with lists, so invalidating
`transactionQueries.all()` refreshes both.

### Server RPC gaps (tracked in client)

Some UI flows are implemented ahead of backend support. Query modules carry **`// TODO(server): ...`** markers at the exact call sites:

- **`account.v1.Account` integration + linked-account IDs** — Add an enum such as `AccountIntegration { UNSPECIFIED, MANUAL, PLAID }` plus fields needed to identify the linked institution/account (e.g. persist Plaid item/account ids from exchange). Wire mapping lives in **`src/models/account.ts`** (**`mapAccount`** / **`integrationFromWireAccount`**); extend **`Account`** when protos add linked-account ids. UI reads **`Account.integration`** (see **`spec/plans/account-integration-api.md`**). Until then the UI treats every account as manual for integration display.
- **`ListTransactions` filtered by account** — the account transactions query passes `account_id` on the wire once the cursor/request supports it; until then filtering may be client-side.

### Client State (Zustand)

Client state is anything the server does not know about: UI preferences, filter
selections, which row is being edited. When a Zustand value should influence
what data is fetched, it feeds into a query key.

The shell uses `stores/useShellStore.ts` for layout chrome: `sidebarOpen` (header burger / `AppShell` layout) and `colorSchemePreference` (light / dark / system). **`persistence/shell/`** holds the typed disk slice (**`ShellPersistedState`**) and **`storage.ts`** (`createJSONStorage` over `localStorage`). **`stores/shellPersistOptions.ts`** supplies **`createShellStorePersistOptions<T extends ShellPersistedState>()`** (`PersistOptions<T, ShellPersistedState>`) so the Zustand `persist` wiring lives next to the store. `colorSchemePreference` is **persisted** with `zustand/middleware` `persist` (hydrated from `localStorage` on startup) and mapped in `App.tsx` to Mantine’s `defaultColorScheme="auto"` or `forceColorScheme` for fixed light/dark. There are no async actions and no server data—small focused client stores only.

```tsx
// Example: a filter store drives query parameters
import { create } from "zustand";

type FilterStore = {
  status: string;
  search: string;
  setStatus: (s: string) => void;
  setSearch: (s: string) => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  status: "all",
  search: "",
  setStatus: (status) => set({ status }),
  setSearch: (search) => set({ search }),
}));
```

```tsx
// Illustrative (no such factory exists today): store values are factory params, so they land in the query key
const status = useFilterStore((s) => s.status);
const search = useFilterStore((s) => s.search);
const { data } = useQuery(transactionQueries.search({ status, search }));
// When status or search changes in the store, the query key changes,
// and TanStack Query refetches automatically. No useEffect needed.
```

### Local Component State (useState)

State that only one component cares about stays local. Examples: whether a modal
is open, the current value of an unsubmitted form field, a hover flag.

```tsx
function CreateAccountModal() {
  const [name, setName] = useState("");
  const createAccount = useMutation(accountMutations.createManual);
  // ...
}
```

## Data Flow

```
  Zustand Store          TanStack Query Cache          ConnectRPC Server
  (client state)         (server state)                (backend)
  ┌────────────┐         ┌──────────────────┐          ┌──────────────┐
  │ filters    │──key──> │ useQuery(...)     │──RPC───> │ ListBudgets  │
  │ selections │         │                  │<──resp──  │ ListAccounts │
  │ UI flags   │         │ cache + stale    │          │ ...          │
  └────────────┘         │ while revalidate │          └──────────────┘
                         └──────────────────┘
                                │
                         ┌──────┴───────┐
                         │  Components  │
                         │  read both   │
                         └──────────────┘
```

1. Query factories map RPC responses to **`models/`** shapes in `select`;
   components read **model** data, not raw protobuf messages.
2. Components read server data with `useQuery` / `useInfiniteQuery` on a factory
   and client data from Zustand selectors or the URL.
3. User actions either update Zustand / the URL (client state change) or run a
   mutation (server state change).
4. When state that is part of a query key changes, TanStack Query refetches
   automatically.
5. Mutations refetch the affected key roots when they settle. Only a few
   latency-sensitive edits also patch the cache optimistically.

## ConnectRPC Client Layer

The app uses `@connectrpc/connect` with `createClient()` to build typed service
clients, **not** the `@connectrpc/connect-query` codegen plugin. Each service
gets a dedicated client singleton in **`src/connectRPC/connect.ts`** (see also
**`src/connectRPC/types.ts`** for wire type re-exports used by **`models/`**):

```tsx
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AccountService } from "./gen/account/v1/account_pb.js";

const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:9447",
  useBinaryFormat: false,
});

export const accountClient = createClient(AccountService, transport);
```

The option factories under **`src/queries/`** call these clients (always through
`rpc()`), and map responses to **`models/`** types in `select` before components
see them. Plaid link-token and exchange options live under **`src/plaid/`**. Demo /
mock transport is handled from **`src/connectRPC/runtime.ts`** (e.g. URL `?mock=true`).

The **`react-plaid-link`** script is injected by the library when **`AccountsView`** runs **`plaid/useConnectedAccountFlow.ts`** (per Plaid’s React integration path). **`vite.config.ts`** sends **`Permissions-Policy`** in dev; mirror that header in production if **`encrypted-media`** warnings persist. ConnectRPC **`plaidClient`** remains in **`connectRPC/connect.ts`**.

## Query Layer Conventions

### Adding a query

Add a factory to the owning domain module in `src/queries/`:

```ts
export const budgetQueries = {
  all: () => ["budgets"] as const,
  range: (start: YearMonth, end: YearMonth) =>
    queryOptions({
      queryKey: [...budgetQueries.all(), "range", start.year, start.month, end.year, end.month] as const,
      queryFn: () => rpc(budgetClient.listBudgets({ /* ... */ })),
      placeholderData: keepPreviousData,
      select: (response) => response.budgets.filter(Boolean).map(mapBudget),
    }),
};
```

- Always call RPCs through **`rpc()`**; never write `try/catch` around a client
  call. Failures surface as `Error` (typed globally via `register.ts`).
- Build keys from the domain's `all()` root so one prefix invalidates everything
  in the domain. Never write query-key string literals outside `src/queries/`.
- Do the wire → model mapping in `select`, not in components. `data` is then
  already `Account[]` / `Category[]`, and structural sharing keeps it referentially
  stable across renders.
- Use it directly: `const { data: accounts = [] } = useInfiniteQuery(accountQueries.list())`.
  The same options work with `queryClient.prefetchQuery` / `ensureQueryData` and in
  tests.

### Adding a mutation

Add a `mutationOptions` constant. It needs no hook: callbacks receive
`context.client`.

```ts
update: mutationOptions({
  mutationKey: ["categories", "update"],
  mutationFn: (body: UpdateCategoryInput) => rpc(categoryClient.updateCategory({ /* ... */ })),
  ...invalidatesOnSettled(categoryQueries.all()),
}),
```

- Default to **`invalidatesOnSettled(...keyRoots)`**. It refetches on success and on
  failure. List every root the write can change (deleting an account also
  invalidates `transactionQueries.all()` because the server cascades).
- Optimistic updates are the exception, not the default. Use them only where the
  round-trip lag is visible on an inline edit (today: `transactionMutations.updateCategory`).
  Do it with `patchQueries()` in `onMutate`, call `onMutateResult?.rollback()` in
  `onError`, and still spread `invalidatesOnSettled`. Do not hand-roll
  snapshot/rollback code.
- Components use `useMutation(accountMutations.update)` and call `mutate` /
  `mutateAsync` with `onSuccess` for UI follow-ups (closing a modal).

### Pagination

`accounts` and `categories` are server-paginated infinite queries; the `select`
flattens pages into one array. Screens that must have every page (e.g. resolving an
account from a direct link) fetch further pages with `fetchNextPage` (see
`useAccountTransactionsData`). Flattening to a single fetch-all `queryFn` would
remove those effects and is a known possible follow-up.

Transactions use offset paging with a server `total_count`. The first response for a
filter pins `maxCreationTime` so later pages do not shift while new transactions
arrive. That window lives in a `Map` owned by one `useTransactionsPager` instance and
is passed into `transactionQueries.list(params, windows)`; it is intentionally not
global, so each visit starts fresh.

## Client State Beyond Zustand

- **URL state.** State that should survive reload or be shareable lives in search
  params, not in a store or `useState`: the selected month (`?month=`,
  `useSelectedYearMonth`) and the transactions page (`?page=`,
  `useTransactionsPager`). Navigation that changes the dataset must clear
  `page` (month changes already do).
- **Forms.** A modal holds its field values in one `useState` object, calls
  `useMutation`, and delegates to the colocated pure form module
  (`emptyXForm`, `isXFormValid`, `toXInput`). Do not create a `useXForm` hook that
  bundles field state, server reads, and the mutation. Modals that edit an entity are
  remounted with `key={entity.id}` so initial values come from `useState(() => ...)`
  rather than an effect.
- **View data.** Derive screen data in a pure `buildXData(...)` function, then call
  it in the thin `useXData` hook with `useMemo`. Tests for the derivation call the
  function directly.

## Anti-Patterns to Avoid

Keep UI and queries free of direct **`connectRPC/gen/`** imports (see import
rules in **`.agents/best-practices.md`**; ESLint enforces them). Also avoid:

- Mirroring server data in Zustand or `useState`.
- Query-key string literals, or `try/catch` around RPCs, outside `src/queries/`.
- New `useXxx` hooks whose only job is to call one `useQuery` / `useMutation`.
- Optimistic cache edits for ordinary create/update/delete flows.
- Hooks that mix local form state, server reads, and mutations.
- `useEffect` to derive lists or copy data between states; use `useMemo` or inline
  computation.

## Testing Conventions

- **Query modules** (`src/queries/*.test.tsx`): mock `../connectRPC/connect.js`, run
  the options through a real `QueryClient` using `createTestQueryClient()` and
  `createWrapper()` from `src/test/renderWithProviders.tsx`, and assert on the RPC
  call arguments, mapped `data`, and invalidation (`getQueryState(key)?.isInvalidated`).
- **Components**: render with `renderWithProviders` and mock the same RPC client
  module with `vi.hoisted` mocks instead of mocking query modules or hooks. Assert
  with `findBy*` / `waitFor`. Use `wireAccount` / `wireCategory` from
  `src/test/wire.ts` to build list responses. A never-resolving promise gives a
  loading state; `mockRejectedValue` gives an error state.
- **Pure modules** (`*Form.ts`, `build*Data.ts`, `models/`): plain unit tests, no
  providers.
- When faking time, only fake `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`);
  faking timers stalls React Query.

## Decision Record


| Decision                                                  | Rationale                                                                                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Query for server state, Zustand for client state | Each library is purpose-built for its role. Combining them via query keys avoids `useEffect` synchronization and keeps a single source of truth per data category.                                                      |
| `createClient()` over `@connectrpc/connect-query` codegen | The app was built with direct `createClient()` calls wrapped in TanStack Query options. This gives full control over query keys, pagination, and cache invalidation without depending on an additional codegen step.     |
| Option factories in `src/queries/` instead of per-query hooks | Keys, fetchers, and wire→model mapping are defined once and reused by components, prefetching, mutations, and tests. Removes duplicated key literals, error handling, and infinite-query boilerplate.                |
| Invalidate-on-settle by default; optimistic updates only for inline edits | Refetching is simple and always consistent; hand-rolled cache patching was duplicated and easy to get wrong. Optimistic updates are kept where lag would be visible (transaction category edits).               |
| Page and month in the URL                                 | Survives reload, shareable, and removes state that had to be reset by hand when filters changed.                                                                                                                       |
| Pure form/view-data modules + thin components             | Logic is testable without rendering; components stay small and readable.                                                                                                                                                |
| `models/` as the UI import boundary for wire data                    | Components and hooks depend on stable model APIs; only **`models/`** imports **`connectRPC/`** for protobuf-derived types (usually via **`connectRPC/types.ts`**). protobuf churn stays under **`connectRPC/gen/`** + **`connectRPC/types.ts`** + model mappers.                                                                 |
| Flat arrays from paginated lists via `select`             | The current data sets are small, so components get a flat `Account[]` / `Category[]`. Screens that need every page fetch them explicitly until a fetch-all query replaces that.                                         |
| No top-level `constants/` or catch-all `utils/`           | Constants and small pure helpers live next to the modules that use them, so imports stay local and ownership is obvious. Promote shared logic into **`models/`** when it is cross-cutting and not tied to a single screen. |


