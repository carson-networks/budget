import type { Account as WireAccount } from "../connectRPC/types";
import { optionalDateFromTimestamp } from "./timestamp.js";

export enum AccountKind {
  Unspecified = 0,
  Cash = 1,
  CreditCards = 2,
}

export type Account = {
  id: string;
  name: string;
  accountKind: AccountKind;
  subType: string;
  balance: string;
  startingBalance: string;
  createdAt?: Date;
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
  };
}
