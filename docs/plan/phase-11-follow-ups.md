# Phase 11: follow-ups

[Overview](README.md) · [Working rules](working-rules.md) · [Sync contract](sync-contract.md) · Previous: [Phase 10](phase-10-server-requested-sync.md)

Unscheduled. Each is a separate piece of work to be specified before an agent picks it up.

| Done | # | Item |
|---|---|---|
| [ ] | 1 | Payment due date, minimum payment and overdue amount from `creditInformation`, stored and shown on the card's row. |
| [ ] | 2 | Populate `transactions.pending` from Plaid, which already reads the flag. |
| [ ] | 3 | Feed the stored `merchantCategoryCode` to default category rules (`budget-server/plan/catergories.md`). |
| [ ] | 4 | Create and revoke API keys from the web UI, with a QR code the app can scan for endpoint and key. |
| [ ] | 5 | Read-only budget views in the app (month summary, transactions needing review), reusing the web RPCs once they have auth. |
| [ ] | 6 | A home-screen widget with last sync time and balances. |
| [ ] | 7 | Auth on the web RPCs, so the stack can be exposed without a VPN. |
| [ ] | 8 | Non-USD accounts and `foreignCurrencyAmount`. |
| [ ] | 9 | CSV/OFX statement upload as a push source for accounts FinanceKit cannot see. |
| [ ] | 10 | App Store release instead of TestFlight, removing the 90-day expiry. |
