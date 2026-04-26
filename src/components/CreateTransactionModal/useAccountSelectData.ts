import { useMemo } from "react";
import type { Account } from "../../hooks/useAccounts";

export function useAccountSelectData(accounts: Account[]) {
  return useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
    [accounts],
  );
}
