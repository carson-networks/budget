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
   server data means calling a query hook, not subscribing to a Zustand store.
2. **Zustand stores are small and focused.** Each store covers one concern
  (filters, UI layout, a feature's client-side selections). Stores do not
   contain `async` actions that call RPCs.
3. **Mutations live in custom hooks, not stores.** A `useMutation` hook wraps
  each write RPC, handles optimistic updates against the TanStack Query cache,
   and invalidates the relevant query keys on success. This keeps cache
   consistency logic co-located with the RPC call.
4. **Prefer query key composition over `useEffect`.** If a piece of client state
  should trigger a refetch, include it in the query key. TanStack Query handles
   the rest.
5. **Wire types stay in `connectRPC/gen/` and `connectRPC/types.ts`.** Only
   **`src/connectRPC/`** imports generated protobuf modules under **`connectRPC/gen/`**.
   **`src/models/`** is the sole consumer of **`src/connectRPC/`** for wire shapes (types
   and clients used in mappers). **`src/hooks/`** (when added) uses **`connectRPC`**
   clients and **`models/`** mappers/types only—not **`connectRPC/gen/`** imports.
   Components use **`models/`** for types and data via hooks.
6. **`models/` is what client code imports for UI-facing model types.** Types, `map*`
   functions (wire → model), and pure helpers live under **`src/models/`**. Hooks call
   ConnectRPC through **`connectRPC/`**, map responses with **`models/`** helpers, and
   expose model-shaped data through TanStack Query.
7. **Colocate constants and utilities with the code that owns them.** Do not use a
  top-level `constants/` directory. Shared literals (enums, lookup tables,
   labels) live next to the components, hooks, or **`models/`** modules that consume
   them. The same applies to small pure helpers: keep them beside their primary
   caller (e.g. `components/BudgetView/monthRange.ts`) rather than a global
   `utils/` junk drawer. Promote shared logic into **`models/`** when it is
   cross-cutting and not wire-specific.

## Project Structure

```
src/
  connectRPC/                   # Connect transport, clients, wire re-exports, codegen
    connect.ts                  # createConnectTransport + per-service createClient singletons
    types.ts                    # re-exports message types/schemas from gen/ for mappers
    runtime.ts                  # demo mode via URL `?mock=true` (isFakeDataMode)
    runtime.test.ts
    gen/                        # generated protobuf types + service descriptors (buf)
      account/v1/
      budget/v1/
      category/v1/
      plaid/v1/
      transaction/v1/

  models/                       # UI-facing models + wire→model mappers; imports connectRPC/ only
    account.ts … plaid.ts       # types, enums, and map* for each area
    accountIntegration.ts       # Plaid vs manual detection via stored sub_type encoding
    money.ts                    # display helpers for amounts (e.g. formatCurrency)
    timestamp.ts                # protobuf Timestamp → Date helpers
    index.ts                    # re-exports types + map* for hooks / UI
    *_test.ts                   # colocated model tests

  hooks/                        # TanStack Query wrappers over connectRPC clients + models mappers
    useAccounts.ts              # list/create accounts; exchange Plaid token
    usePlaidLinkToken.ts       # Plaid Link token (createLinkToken)
    plaidWire.ts               # Plaid Link metadata → ExchangeTokenRequest
    useTransactions.ts        # (planned) list transactions
    cachePatches.ts             # infinite-query cache helpers for mutations
    *.test.ts

  persistence/                  # client-side storage adapters (typed disk slices)
    shell/
      types.ts                  # ColorSchemePreference + ShellPersistedState
      storage.ts                # JSON localStorage adapter for shell persist

  stores/                       # Zustand stores (client-only state)
    shellPersistOptions.ts      # persist key + createShellStorePersistOptions
    useShellStore.ts            # app chrome: sidebar + color scheme
    *.test.ts

  test/
    setup.ts                    # Vitest + RTL global setup

  App.tsx
  main.tsx
  theme.ts
  index.css

  components/                   # React components
    AppShell/
      AppShell.tsx
      AppHeader.tsx
      AppSidebar.tsx
      SidebarNavItem.tsx
      navItems.ts
      *.test.tsx
    Account/                      # accounts feature: views + modals colocated
      AccountsView/
      AccountTransactionsView/    # (planned) per-account transactions route
      CreateManualAccountModal/
      CreateConnectedAccountModal/
      EditAccountModal/
    shared/                       # cross-feature presentation primitives (shells, layout)
      SectionCard.tsx
      FloatingCreateButton.tsx
      ViewShell.tsx
      ViewLoadingState.tsx
      ViewErrorAlert.tsx
      DeleteConfirmBar.tsx        # (planned, edit flows)
    BudgetView/
    TransactionsView/
    ...
```

Feature folders such as **`components/Account/`** group screens and modals for one domain; **`components/shared/`** holds Mantine shells used across routes.

TanStack Query hooks live under **`src/hooks/`** and depend on **`connectRPC/`** + **`models/`** only (no **`connectRPC/gen/`** imports from hooks).

Until the tree matches this spec, any legacy top-level `constants/` or `utils/`
folders should be merged into the owning feature or **`models/`** incrementally.

## State Ownership Rules

### Server State (TanStack Query)

Anything returned by a ConnectRPC service is server state. The query cache owns
it, and components read it through hooks.


| Data                     | Hook                             | Query Key                                                            |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------- |
| Accounts list            | `useAllAccounts()`               | `["accounts"]`                                                       |
| Transactions list        | `useAllTransactions()`           | `["transactions"]`                                                   |
| Transactions for account | `useTransactionsForAccount(id)`  | `["transactions", { accountId }]` (planned; server filter TODO)      |
| Categories list          | `useAllCategories()`             | `["categories"]`                                                     |
| Budgets for a date range | `useBudgetsForRange(start, end)` | `["budgets", startYear, startMonth, endYear, endMonth, categoryKey]` |


Mutations (`useCreateManualAccount`, `useSetBudget`, etc.) perform optimistic cache
updates via shared cache helpers under **`hooks/cachePatches.ts`** (when applicable),
then invalidate the corresponding query key so the cache reconciles with the server.

### Server RPC gaps (tracked in client)

Some UI flows are implemented ahead of backend support. Hooks carry **`// TODO(server): ...`** markers at the exact call sites:

- **`UpdateAccount`** — edit-account save paths call a mutation that patches the TanStack Query cache until the RPC exists.
- **`DeleteAccount`** — delete flow patches the cache locally until the RPC exists.
- **`ListTransactions` filtered by account** — `useTransactionsForAccount` will pass `account_id` on the wire once the cursor/request supports it; until then filtering may be client-side.

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
// A query hook that reads from the store and includes filters in its key
export function useFilteredTransactions() {
  const status = useFilterStore((s) => s.status);
  const search = useFilterStore((s) => s.search);

  return useAllTransactions({
    queryKey: ["transactions", { status, search }],
    // ... filter logic
  });
}
// When status or search changes in the store, the query key changes,
// and TanStack Query refetches automatically. No useEffect needed.
```

### Local Component State (useState)

State that only one component cares about stays local. Examples: whether a modal
is open, the current value of an unsubmitted form field, a hover flag.

```tsx
function CreateAccountModal() {
  const [name, setName] = useState("");
  const createAccount = useCreateAccount();
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

1. Hooks map RPC responses (and prepare mutation payloads) between wire types and
   **`models/`** shapes; components read **model** data from TanStack Query hooks,
   not raw protobuf messages.
2. Components read server data from TanStack Query hooks and client data from
  Zustand selectors.
3. User actions either update Zustand (client state change) or call a mutation
  hook (server state change).
4. When Zustand state that is part of a query key changes, TanStack Query
  refetches automatically.
5. Mutations optimistically patch the query cache, then invalidate to
  reconcile.

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

TanStack Query hooks under **`src/hooks/`** wrap these clients with
`useQuery`, `useInfiniteQuery`, and `useMutation`. They map RPC request and response
messages to **`models/`** types before surfacing data to components. Demo / mock
transport is handled from **`src/connectRPC/runtime.ts`** (e.g. URL `?mock=true`).

The **`react-plaid-link`** dependency supports Plaid Link in **`components/Account/CreateConnectedAccountModal/`** (ConnectRPC **`plaidClient`** remains in **`connectRPC/connect.ts`**).

## Cache Management Patterns

### Optimistic Updates

Write mutations use shared cache-patch helpers (when present) to update the
infinite-query cache immediately, then invalidate the query key so TanStack
Query reconciles with the server response on the next fetch. Typical helpers:

- `prependToInfiniteList` — insert a new item at the top of page 1
- `removeFromInfiniteList` — remove items matching a predicate from all pages
- `updateInInfiniteList` — replace items matching a predicate in all pages

### Exhaustive Pagination

The `useExhaustivePaginatedQuery` helper (when added under **`hooks/`**) wraps
`useInfiniteQuery` to auto-fetch all remaining pages once the first page loads,
collapsing multi-page results into a flat `items` array. This is one acceptable
use of `useEffect` for data loading — it drives the "fetch next page" loop.

### Budget Cache Patching

Budget mutations (`useSetBudget`) walk every cached `listBudgets` response and
apply the operation to any cache entry whose date range overlaps the target
month. This avoids a full refetch while keeping all visible budget views
consistent.

## Anti-Patterns to Avoid

Keep UI and hooks free of direct **`connectRPC/gen/`** imports (see import
rules in **`.agents/best-practices.md`**). Avoid mirroring server data in Zustand,
keep RPCs in TanStack Query hooks, and derive lists with `useMemo` (or inline)
instead of `useEffect`. Full examples live in **`.agents/best-practices.md`**;
ESLint enforces the import boundaries there.

## Decision Record


| Decision                                                  | Rationale                                                                                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Query for server state, Zustand for client state | Each library is purpose-built for its role. Combining them via query keys avoids `useEffect` synchronization and keeps a single source of truth per data category.                                                      |
| `createClient()` over `@connectrpc/connect-query` codegen | The app was built with direct `createClient()` calls wrapped in custom TanStack Query hooks. This gives full control over query keys, pagination, and cache patching without depending on an additional codegen step.   |
| Optimistic cache patches + invalidation                   | Immediate UI feedback on mutations; server reconciliation on the next fetch. Avoids loading spinners for common write operations.                                                                                       |
| `models/` as the UI import boundary for wire data                    | Components and hooks depend on stable model APIs; only **`models/`** imports **`connectRPC/`** for protobuf-derived types (usually via **`connectRPC/types.ts`**). protobuf churn stays under **`connectRPC/gen/`** + **`connectRPC/types.ts`** + model mappers.                                                                 |
| Exhaustive pagination via auto-fetching                   | The current data sets are small enough that loading all pages upfront is acceptable. This simplifies component logic (flat array vs. paged iteration) at the cost of additional initial requests.                       |
| No top-level `constants/` or catch-all `utils/`           | Constants and small pure helpers live next to the modules that use them, so imports stay local and ownership is obvious. Promote shared logic into **`models/`** when it is cross-cutting and not tied to a single screen. |


