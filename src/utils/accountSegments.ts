import type { Account } from "../gen/account/v1/account_pb.js";
import { AccountType } from "../gen/account/v1/account_pb.js";

export type AccountTypeSegment = {
  type: AccountType;
  accounts: Account[];
};

const TYPE_ORDER: AccountType[] = [
  AccountType.CASH,
  AccountType.CREDIT_CARDS,
  AccountType.UNSPECIFIED,
];

/** One Paper per account type; empty types omitted. Accounts sorted by name. */
export function groupAccountsByType(accounts: Account[]): AccountTypeSegment[] {
  const byType = new Map<AccountType, Account[]>();
  for (const t of TYPE_ORDER) {
    byType.set(t, []);
  }

  for (const a of accounts) {
    const bucket = byType.get(a.type);
    if (bucket) {
      bucket.push(a);
    } else {
      byType.get(AccountType.UNSPECIFIED)!.push(a);
    }
  }

  const segments: AccountTypeSegment[] = [];
  for (const t of TYPE_ORDER) {
    const list = byType.get(t) ?? [];
    if (list.length === 0) continue;
    list.sort((a, b) => a.name.localeCompare(b.name));
    segments.push({ type: t, accounts: list });
  }
  return segments;
}
