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
5. **Wire types stay in `network/` and `gen/`.** Only **`src/api/`** and
   **`src/network/`** import **`src/gen/`**. **`src/domain/`** is the sole consumer
   of **`src/network/`** (wire message types and schemas for mapping). **`src/hooks/`**
   use **`src/api/`** clients and **`src/domain/`** mappers/types only—not `gen/` or
   `network/` imports. Components use **`domain/`** for types and data via hooks.
6. **`domain/` is what client code imports.** Types, `map*` functions (wire → domain),
   and pure helpers live under **`src/domain/`**. Hooks call ConnectRPC through **`api/`**,
   map responses with **`domain/`** helpers, and expose domain-shaped data through TanStack Query.
7. **Colocate constants and utilities with the code that owns them.** Do not use a
  top-level `constants/` directory. Shared literals (enums, lookup tables,
   labels) live next to the components, hooks, or `domain/` modules that consume
   them. The same applies to small pure helpers: keep them beside their primary
   caller (e.g. `components/BudgetView/monthRange.ts`) rather than a global
   `utils/` junk drawer. Promote shared logic into `domain/` when it is
   cross-cutting and not wire-specific.

## Project Structure

```
src/
  gen/                          # generated proto types and service descriptors
    account/v1/
    budget/v1/
    category/v1/
    plaid/v1/
    transaction/v1/

  domain/                       # UI types, wire→domain mappers (imports network/ only)
    timestamp.ts                # protobuf Timestamp → Date helpers
    ...

  network/                      # wire re-exports from gen/; imported only by domain/
    types.ts                    # protobuf messages & schemas for hooks (via domain mappers)
    budgets.ts                  # RPC-oriented helpers (mapping, carry-forward, …)
    budgetRollups.ts            # rollup computation over wire or domain shapes
    categories.ts               # category tree utilities
    transactions.ts             # transaction grouping/filtering helpers
    yearMonth.ts                # year/month comparison helpers

  api/                          # transport, clients, cache utilities
    connect.ts                  # creates ConnectRPC clients per service
    runtime.ts                  # demo mode via URL `?mock=true` (isFakeDataMode)
    cacheHelpers.ts             # generic infinite-query cache patch utilities
    mockTransport.ts            # in-memory mock transport for demo mode
    mockStore.ts                # seed data for mock transport
    mockData.ts                 # fixture generation

  hooks/                        # TanStack Query wrappers per service
    useAccounts.ts              # useAllAccounts, useCreateAccount, useDeleteAccount
    useTransactions.ts          # useAllTransactions, useCreateTransaction, ...
    useCategories.ts            # useAllCategories, useCreateCategory, ...
    useBudgets.ts               # useBudgetsForRange, useSetBudget
    usePaginatedQuery.ts        # shared useExhaustivePaginatedQuery helper

  stores/                       # Zustand stores (client-only state)
    (currently inline in components — to be extracted here as needed)

  components/                   # React components
    AppShell.tsx
    BudgetView/
    TransactionsView/
    AccountsView/
    ...
```

Until the tree matches this spec, any legacy top-level `constants/` or `utils/`
folders should be merged into the owning feature or `domain/` incrementally.

## State Ownership Rules

### Server State (TanStack Query)

Anything returned by a ConnectRPC service is server state. The query cache owns
it, and components read it through hooks.


| Data                     | Hook                             | Query Key                                                            |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------- |
| Accounts list            | `useAllAccounts()`               | `["accounts"]`                                                       |
| Transactions list        | `useAllTransactions()`           | `["transactions"]`                                                   |
| Categories list          | `useAllCategories()`             | `["categories"]`                                                     |
| Budgets for a date range | `useBudgetsForRange(start, end)` | `["budgets", startYear, startMonth, endYear, endMonth, categoryKey]` |


Mutations (`useCreateAccount`, `useSetBudget`, etc.) perform optimistic cache
updates via the helpers in `api/cacheHelpers.ts`, then invalidate the
corresponding query key so the cache reconciles with the server.

### Client State (Zustand)

Client state is anything the server does not know about: UI preferences, filter
selections, which row is being edited. When a Zustand value should influence
what data is fetched, it feeds into a query key.

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
   **`domain/`** models; components read **domain** data from TanStack Query hooks,
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
gets a dedicated client singleton in `src/api/connect.ts`:

```tsx
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AccountService } from "../gen/account/v1/account_pb.js";

const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:9447",
  useBinaryFormat: false,
});

export const accountClient = createClient(AccountService, transport);
```

Hooks in `src/hooks/` wrap these clients with TanStack Query's `useQuery`,
`useInfiniteQuery`, and `useMutation`. They map RPC request and response
messages to **`domain/`** types before surfacing data to components. The
transport is resolved once at module init time and supports swapping to a mock
transport for demo mode when the URL includes `?mock=true` (see
`src/api/runtime.ts`).

## Cache Management Patterns

### Optimistic Updates

Write mutations use the helpers in `api/cacheHelpers.ts` to patch the
infinite-query cache immediately, then invalidate the query key so TanStack
Query reconciles with the server response on the next fetch:

- `prependToInfiniteList` -- insert a new item at the top of page 1
- `removeFromInfiniteList` -- remove items matching a predicate from all pages
- `updateInInfiniteList` -- replace items matching a predicate in all pages

### Exhaustive Pagination

The `useExhaustivePaginatedQuery` helper wraps `useInfiniteQuery` to auto-fetch
all remaining pages once the first page loads, collapsing multi-page results
into a flat `items` array. This is the one place where `useEffect` is
acceptable for data loading -- it drives the "fetch next page" loop.

### Budget Cache Patching

Budget mutations (`useSetBudget`) walk every cached `listBudgets` response and
apply the operation to any cache entry whose date range overlaps the target
month. This avoids a full refetch while keeping all visible budget views
consistent.

## Anti-Patterns to Avoid

Keep UI and hooks free of direct `src/gen/` and `src/network/` imports (see import
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
| `domain/` as the UI import boundary                       | Components and hooks depend on stable domain APIs; only `domain/` imports `network/` (protobuf churn stays in `network/` + domain mappers).                                                                 |
| Exhaustive pagination via auto-fetching                   | The current data sets are small enough that loading all pages upfront is acceptable. This simplifies component logic (flat array vs. paged iteration) at the cost of additional initial requests.                       |
| No top-level `constants/` or catch-all `utils/`           | Constants and small pure helpers live next to the modules that use them, so imports stay local and ownership is obvious. Promote shared logic into `domain/` when it is cross-cutting and not tied to a single screen. |


