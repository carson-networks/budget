import type { Account as WireAccount } from "../connectRPC/types";
import { optionalDateFromTimestamp } from "./timestamp.js";

export enum AccountKind {
  Unspecified = 0,
  Cash = 1,
  CreditCards = 2,
}

export enum AccountIntegration {
  Unspecified = 0,
  Manual = 1,
  Plaid = 2,
}

export type Account = {
  id: string;
  name: string;
  accountKind: AccountKind;
  subType: string;
  balance: string;
  startingBalance: string;
  createdAt?: Date;
  integration: AccountIntegration;
};

export function mapAccount(wire: WireAccount): Account {
  return {
    id: wire.id,
    name: wire.name,
    accountKind: wire.type as unknown as AccountKind,
    subType: wire.subType,
    balance: wire.balance,
    startingBalance: wire.startingBalance,
    createdAt: optionalDateFromTimestamp(wire.createdAt),
    integration: integrationFromWireAccount(wire),
  };
}

function integrationFromWireAccount(wire: WireAccount): AccountIntegration {
  void wire;
  return AccountIntegration.Manual;
}
