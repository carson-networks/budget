# ios/

The OpenPersonalFinance iPhone app, its FinanceKit background delivery extension, and the `OpenPersonalFinanceKit` Swift package. Xcode 27.2, Swift 6, SwiftUI, iOS 27.

Before writing or reviewing Swift here, read:

- [best-practices.md](best-practices.md): layout, package targets and import boundaries, concurrency, views and models, networking, storage, testing.
- [docs/plan/working-rules.md](../docs/plan/working-rules.md): task process, repo checks and iOS conventions.
- [docs/plan/README.md](../docs/plan/README.md): what the app does and the numbered design decisions.

Checks before a PR, from this folder:

```bash
make format
make lint
make test
```
