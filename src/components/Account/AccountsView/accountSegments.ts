import type { Account } from "../../../models";
import { AccountKind } from "../../../models";

export type AccountKindSegment = {
  kind: AccountKind;
  accounts: Account[];
};

const KIND_ORDER: AccountKind[] = [
  AccountKind.Cash,
  AccountKind.CreditCards,
  AccountKind.Unspecified,
];

/** One section per account kind; empty kinds omitted. Accounts sorted by name. */
export function groupAccountsByKind(accounts: Account[]): AccountKindSegment[] {
  const byKind = new Map<AccountKind, Account[]>();
  for (const k of KIND_ORDER) {
    byKind.set(k, []);
  }

  for (const a of accounts) {
    const bucket = byKind.get(a.accountKind);
    if (bucket) {
      bucket.push(a);
    } else {
      byKind.get(AccountKind.Unspecified)!.push(a);
    }
  }

  const segments: AccountKindSegment[] = [];
  for (const k of KIND_ORDER) {
    const list = byKind.get(k) ?? [];
    if (list.length === 0) continue;
    list.sort((a, b) => a.name.localeCompare(b.name));
    segments.push({ kind: k, accounts: list });
  }
  return segments;
}
