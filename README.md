# Budget (web)

React + TypeScript + Vite UI for the budget stack.

## API (Connect-RPC)

The app talks to **budget-server** over [Connect](https://connectrpc.com/) (JSON on the wire).

- Default base URL: `http://localhost:9447` (Connect server in `budget-server` `main.go`).
- Override with env: `VITE_CONNECT_URL` (e.g. in `.env.development`).

## Regenerating protobuf TypeScript

From this repo (with `budget-server` checked out as a sibling directory):

```bash
pnpm run generate:connect
```

Requires the [Buf CLI](https://buf.build/docs/installation) (`@bufbuild/buf` is a devDependency; `pnpm exec buf …` also works).

---

This project was bootstrapped with Vite. For generic Vite + React notes, see the original template documentation in git history if needed.
