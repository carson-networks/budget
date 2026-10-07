import { useEffect, useMemo } from "react";
import { useAllAccounts } from "../../../hooks/useAccounts.js";
import { useAllCategories } from "../../../hooks/useCategories.js";
import {
  useAllTransactions,
  TRANSACTIONS_PAGE_SIZE,
} from "../../../hooks/useTransactions.js";

export function useAccountTransactionsData(accountId: string) {
  const accountsQuery = useAllAccounts();
  const categoriesQuery = useAllCategories();
  const account = accountsQuery.accounts.find(
    (account) => account.id === accountId,
  );
  const {
    fetchNextPage: fetchAccounts,
    hasNextPage: hasMoreAccounts,
    isFetchingNextPage: fetchingAccounts,
  } = accountsQuery;
  const {
    fetchNextPage: fetchCategories,
    hasNextPage: hasMoreCategories,
    isFetchingNextPage: fetchingCategories,
  } = categoriesQuery;

  // A direct link can target an account beyond the first accounts page.
  useEffect(() => {
    if (
      !account &&
      hasMoreAccounts &&
      !fetchingAccounts &&
      !accountsQuery.error
    ) {
      void fetchAccounts();
    }
  }, [
    account,
    hasMoreAccounts,
    fetchingAccounts,
    fetchAccounts,
    accountsQuery.error,
  ]);

  useEffect(() => {
    if (
      account &&
      hasMoreCategories &&
      !fetchingCategories &&
      !categoriesQuery.error
    ) {
      void fetchCategories();
    }
  }, [
    account,
    hasMoreCategories,
    fetchingCategories,
    fetchCategories,
    categoriesQuery.error,
  ]);

  const transactionsQuery = useAllTransactions(TRANSACTIONS_PAGE_SIZE, {
    accountId,
    enabled: account !== undefined,
  });
  const accountNameById = useMemo(
    () =>
      new Map(
        accountsQuery.accounts.map((account) => [account.id, account.name]),
      ),
    [accountsQuery.accounts],
  );
  const categoryNameById = useMemo(
    () =>
      new Map(
        categoriesQuery.categories.map((category) => [
          category.id,
          category.name,
        ]),
      ),
    [categoriesQuery.categories],
  );

  return {
    ...transactionsQuery,
    account,
    accountNameById,
    categoryNameById,
    isLoading:
      accountsQuery.isLoading ||
      (!account && !!hasMoreAccounts && !accountsQuery.error) ||
      (!!account &&
        (categoriesQuery.isLoading ||
          (transactionsQuery.isLoading &&
            !transactionsQuery.isPlaceholderData))),
    error:
      accountsQuery.error ?? categoriesQuery.error ?? transactionsQuery.error,
  };
}
