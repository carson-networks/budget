# Sync contract

What the app reads, what it sends, and what the server stores. Back to the [overview](README.md).

This file is the source for the proto in phase 3. Phase 2 corrects it against real devices; after phase 3 changes are additive only. The proto below is complete, including what phase 10 implements.

## Mapping

| FinanceKit | budget |
|---|---|
| `Account.liability` | `ACCOUNT_TYPE_CREDIT_CARDS`, `sub_type` `apple_card` |
| `Account.asset` | `ACCOUNT_TYPE_CASH`, `sub_type` `apple_cash` or `apple_savings`, picked in the app when the account is added (default guessed from `displayName`) |
| `displayName` | Default account name, editable in the app before adding |
| `transactionAmount` + `creditDebitIndicator == .debit` | negative amount (money out, same as Plaid) |
| `transactionAmount` + `.credit` | positive amount |
| `merchantName ?? transactionDescription` | `transaction_name` |
| `merchantName` | `merchant_name` |
| `transactionDate` | `transaction_date` |
| `merchantCategoryCode` | sent and stored on the link row; unused until phase 11 item 3 |
| `status` `authorized`, `pending` | `pending = true`, `needs_review = true` |
| `status` `booked` | `pending = false`; `needs_review` left as it is on update, `true` on insert |
| `status` `rejected` | transaction and link deleted |
| `status` `memo` | skipped by the app, never sent |
| a deleted change | transaction and link deleted |
| `AccountBalance.currentBalance` | `accounts.balance`; `booked` preferred, `available` as fallback. Sign per the phase 2 results table |
| `creditInformation.creditLimit` | `accounts.credit_limit` |

Rules that hold everywhere:

- Amounts travel as decimal strings. The app never converts money through `Double`.
- A category set in the web UI is never changed by a sync.
- An update never clears `needs_review` that a person already cleared, and never re-raises it.
- Only USD accounts are accepted; anything else is refused with `InvalidArgument`.

## Sync run

Every trigger runs the same steps in `SyncEngine`:

1. Take the cross-process lock; if it is held, exit.
2. Send any batches left in the outbox, oldest first.
3. `GetStatus`: stop with a clear state if the key is refused.
4. `ListAccounts`: learn which FinanceKit accounts are linked and owned by this key.
5. For each owned account: read account, balance and transaction changes since the saved tokens; map; split into batches of at most 500 transactions; write each batch and the tokens it covers to the outbox.
6. `PushChanges` per batch. On success, save the tokens and delete the outbox entry. On failure, leave it for the next run.
7. Append a line to the run log: trigger, duration, counts, outcome.

Triggers: **Sync now**, app becoming active, live monitoring, FinanceKit background delivery and background refresh (phase 7), and a silent push requested by the server (phase 10).

A full resync clears the tokens for an account and sends everything again, usually over several batches:

- Every batch has `full_resync = true`. On the first one the server stamps `resync_started_at` on the account link (a batch arriving with the flag when no resync is open starts one).
- Every upsert, changed or not, stamps `seen_at` on its transaction link.
- The last batch also has `resync_complete = true`. The server then deletes that account's linked transactions whose `seen_at` is older than `resync_started_at`, and clears the stamp.
- A resync that never completes deletes nothing.

## Proto

`proto/financekit/v1/financekit.proto` in budget-server.

```proto
syntax = "proto3";
package financekit.v1;

import "account/v1/account.proto";
import "google/protobuf/timestamp.proto";

service FinanceKitService {
  // Checks the key. Returns who the key is and what the server supports.
  rpc GetStatus(GetStatusRequest) returns (GetStatusResponse);
  // FinanceKit-type accounts only, with their links and owners.
  rpc ListAccounts(ListAccountsRequest) returns (ListAccountsResponse);
  // Creates a budget account for a Wallet account, or takes over an existing link.
  rpc LinkAccount(LinkAccountRequest) returns (LinkAccountResponse);
  // Removes this key's link. The budget account and its transactions are kept.
  rpc UnlinkAccount(UnlinkAccountRequest) returns (UnlinkAccountResponse);
  // One atomic, idempotent batch of changes for one account.
  rpc PushChanges(PushChangesRequest) returns (PushChangesResponse);
  // Called at launch and whenever APNs rotates the token. Implemented in phase 10.
  rpc RegisterPushToken(RegisterPushTokenRequest) returns (RegisterPushTokenResponse);
}

message GetStatusRequest {}
message GetStatusResponse {
  string key_name = 1;
  string server_version = 2;
  bool push_enabled = 3;              // server has APNs configured (phase 10)
}

message LinkedAccount {
  account.v1.Account account = 1;
  repeated string financekit_account_ids = 2;
  string owner_key_name = 3;
  bool owned_by_caller = 4;
}
message ListAccountsRequest {}
message ListAccountsResponse { repeated LinkedAccount accounts = 1; }

message LinkAccountRequest {
  string financekit_account_id = 1;
  oneof target {
    NewAccount new_account = 2;
    string existing_account_id = 3;   // must be FinanceKit-type
  }
  bool take_over = 4;                 // required when another key owns the account
}
message NewAccount {
  string name = 1;
  account.v1.AccountType type = 2;
  string sub_type = 3;
  string currency_code = 4;
  string institution_name = 5;
}
message LinkAccountResponse { string account_id = 1; }

message UnlinkAccountRequest { string financekit_account_id = 1; }
message UnlinkAccountResponse {}

enum TransactionStatus {
  TRANSACTION_STATUS_UNSPECIFIED = 0;
  TRANSACTION_STATUS_AUTHORIZED = 1;
  TRANSACTION_STATUS_PENDING = 2;
  TRANSACTION_STATUS_BOOKED = 3;
  TRANSACTION_STATUS_REJECTED = 4;
}

message WalletTransaction {
  string id = 1;                      // FinanceKit Transaction.id; the idempotency key
  string amount = 2;                  // decimal string, always positive
  bool is_credit = 3;
  string description = 4;
  optional string merchant_name = 5;
  optional int32 merchant_category_code = 6;
  google.protobuf.Timestamp transaction_date = 7;
  optional google.protobuf.Timestamp posted_date = 8;
  TransactionStatus status = 9;
}

message WalletBalance {
  string amount = 1;                  // decimal string, already signed for budget
  google.protobuf.Timestamp as_of = 2;
}

message PushChangesRequest {
  string financekit_account_id = 1;
  repeated WalletTransaction upserted_transactions = 2;
  repeated string deleted_transaction_ids = 3;
  optional WalletBalance balance = 4;
  optional string credit_limit = 5;
  bool full_resync = 6;               // this batch is part of a full resync
  bool resync_complete = 7;           // last batch of that resync
}
message PushChangesResponse {
  int32 inserted = 1;
  int32 updated = 2;
  int32 deleted = 3;
  int32 unchanged = 4;
}

enum PushEnvironment {
  PUSH_ENVIRONMENT_UNSPECIFIED = 0;
  PUSH_ENVIRONMENT_SANDBOX = 1;
  PUSH_ENVIRONMENT_PRODUCTION = 2;
}
message RegisterPushTokenRequest {
  string token = 1;                   // hex device token; empty clears it
  PushEnvironment environment = 2;
}
message RegisterPushTokenResponse {}
```

Additions to existing protos:

```proto
// account/v1/account.proto
enum AccountIntegration {
  ACCOUNT_INTEGRATION_UNSPECIFIED = 0;
  ACCOUNT_INTEGRATION_MANUAL = 1;
  ACCOUNT_INTEGRATION_PLAID = 2;
  ACCOUNT_INTEGRATION_FINANCEKIT = 3;
}
// on Account
AccountIntegration integration = 8;
optional google.protobuf.Timestamp last_synced_at = 9;
optional string credit_limit = 10;

// transaction/v1/transaction.proto, on Transaction
bool pending = 10;
```

## Errors

| Case | Code |
|---|---|
| Missing, unknown or revoked key | `Unauthenticated` |
| Unknown `financekit_account_id` in `PushChanges` or `UnlinkAccount` | `NotFound` |
| Account owned by another key, without `take_over` | `FailedPrecondition` |
| `existing_account_id` is manual or Plaid | `FailedPrecondition` |
| Non-USD account, bad decimal, missing required field, more than 500 transactions | `InvalidArgument` |

The app treats `Unauthenticated` as "fix settings", `NotFound` as "relink this account", and anything else as "retry later".

## Tables

```sql
CREATE TABLE api_keys (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         TEXT NOT NULL,
    key_hash     BYTEA NOT NULL UNIQUE,     -- sha256
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);

CREATE TABLE financekit_account_links (
    financekit_account_id UUID PRIMARY KEY,
    account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    api_key_id            UUID NOT NULL REFERENCES api_keys(id),
    institution_name      TEXT NOT NULL,
    resync_started_at     TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_financekit_account_links_account_id ON financekit_account_links(account_id);

CREATE TABLE financekit_transaction_links (
    financekit_transaction_id UUID PRIMARY KEY,
    transaction_id            UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id                UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    merchant_category_code    INTEGER,
    seen_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_financekit_transaction_links_transaction_id ON financekit_transaction_links(transaction_id);
CREATE INDEX idx_financekit_transaction_links_account_id ON financekit_transaction_links(account_id);

ALTER TABLE transactions ADD COLUMN pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts     ADD COLUMN credit_limit DECIMAL(100,4);
ALTER TABLE syncs        ADD COLUMN last_synced_at TIMESTAMPTZ;

-- phase 10: a key is a phone, so its push token lives on the key
ALTER TABLE api_keys ADD COLUMN apns_token TEXT;
ALTER TABLE api_keys ADD COLUMN apns_environment SMALLINT;
ALTER TABLE api_keys ADD COLUMN apns_token_updated_at TIMESTAMPTZ;
```

Each is added in the phase that first uses it; migration numbers start at `000009` (confirm the next free number).

## Ownership

- The key that links an account owns it. Only the owner may `PushChanges` for it.
- Another phone that sees the same Wallet account calls `LinkAccount` with `existing_account_id` and `take_over = true`. The owner changes; if that phone's FinanceKit account ID differs, a second link row is added for the same budget account.
- Revoking a key leaves its links in place; any other key may then take them over without `take_over`. It also clears the key's push token.

Whether a take-over can avoid duplicates depends on the phase 2 results.

## Phone test results

Filled in by P2-H1, recorded here by P2-A1.

| Question | Answer |
|---|---|
| Apple Card balance: which of `available` / `booked` is the amount owed, and its `creditDebitIndicator` | |
| Cash and Savings balance matches Wallet | |
| A purchase is `.debit` on both asset and liability accounts | |
| A pending charge keeps its `id` when it books (arrives as an update, not delete + insert) | |
| A rejected or reversed charge arrives as a `rejected` update, a deleted change, or both | |
| `creditInformation.creditLimit` is populated for Apple Card | |
| Same shared account on two phones: `Account.id` equal? | |
| Same shared account on two phones: `Transaction.id` equal? | |
| Background delivery wake times over 48 hours at `hourly` | |
| Extension can read FinanceKit and reach the network while the phone is locked | |
| Server reachable from the phone on Wi-Fi, on cellular, and over VPN in the background | |
