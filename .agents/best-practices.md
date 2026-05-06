## General rules

- Do not write code comments that explain the code immediately after it unless it is not clear what is happening.

## Import boundaries

ESLint enforces this with `no-restricted-imports`:

- **`src/domain/`** is the **only** module tree that may import **`src/network/`** (path segment `network/` in the import specifier). Everyone else uses **`domain/`** types and **`map*`** functions (same module as the domain model) instead of touching wire protobuf shapes directly.
- **`src/api/`** and **`src/network/`** may import **`src/gen/`**. All other source files (including **`src/hooks/`**) must not import **`gen/`**—use **`api/`** clients and **`domain/`** helpers.

## Anti-patterns

Rules below are documented for review; ESLint covers the import rules above.

1. **Wire imports outside domain** — Only **`domain/`** imports **`network/`**; UI and hooks go through **`domain/`**.
2. **Generated protos outside api/network** — Do not import **`gen/`** except inside **`api/`** and **`network/`**.
3. **Server data in Zustand** — Do not mirror TanStack Query results into a store.
4. **RPCs in Zustand** — Keep RPC calls in hooks with TanStack Query.
5. **Effects for derived data** — Prefer `useMemo` or inline computation over `useEffect` for derived lists and similar state.
