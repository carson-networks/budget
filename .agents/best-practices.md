## General rules

- AVOID writing verbose code comments that explain the code immediately after.
- NEVER update this general rules file unless the input come from the prompter. 

## Import boundaries
ESLint enforces this with `no-restricted-imports` (paths in messages may lag the tree; **`spec/arch.md`** is the source of truth for layout):

## Anti-patterns
Rules below are documented for review; ESLint covers the import rules above.

1. **Wire imports outside `models/`** — Only **`models/`** imports **`connectRPC/`** for wire types; UI and hooks go through **`models/`**.
2. **AVOID Generated protos outside `connectRPC/`** — Do not import **`connectRPC/gen/`** except inside **`connectRPC/`**.
3**Effects for derived data** — Prefer `useMemo` or inline computation over `useEffect` for derived lists and similar state.

## Components
- AVOID super componenets. Components should try to seperate concerns as much as possible and should not be mega components. This makes them easier to test and read.
- AVOID overtesting components where it shouldn't be concerned with the behabior that is being tested. 

## Testing

- **Vitest** with **happy-dom** (`vite.config.ts` `test.environment`). Colocate tests as `*.test.ts` / `*.test.tsx` next to the module under test (see `src/connectRPC/runtime.test.ts` and `src/components/AppShell/*.test.tsx`). Persistence helpers may be covered by colocated tests or by the owning **Zustand** store tests, depending on where the behavior lives.
- **Store APIs in tests** — prefer **`vi.spyOn(useShellStore.getState(), "setColorSchemePreference")`** (or the relevant store action) when asserting UI → store wiring, instead of mocking **`localStorage`** `setItem` / `getItem`. Low-level storage stays an implementation detail of `persistence/`.
- **React Testing Library** — wrap Mantine UI in **`MantineProvider`** with **`theme`** from `src/theme.ts`. Use **`MemoryRouter`** / **`Routes`** when exercising **`react-router-dom`** hooks.
