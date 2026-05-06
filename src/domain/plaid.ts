import type { SyncAccount as WireSyncAccount } from "../network/types.js";
import { AccountKind } from "./account.js";

export type PlaidSyncAccount = {
  plaidAccountId: string;
  name: string;
  accountKind: AccountKind;
  subType: string;
  balance: string;
};

export type LinkTokenResult = {
  linkToken: string;
  expiration?: Date;
};

export type ExchangeTokenInput = {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidSyncAccount[];
};

export function mapPlaidSyncAccount(wire: WireSyncAccount): PlaidSyncAccount {
  return {
    plaidAccountId: wire.plaidAccountId,
    name: wire.name,
    accountKind: wire.type as unknown as AccountKind,
    subType: wire.subType,
    balance: wire.balance,
  };
}
