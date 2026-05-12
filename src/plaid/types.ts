import type { AccountKind } from "../models";

export type PlaidSyncAccount = {
  plaidAccountId: string;
  name: string;
  accountKind: AccountKind;
  subType: string;
  balance: string;
};

export type ExchangeTokenInput = {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidSyncAccount[];
};
