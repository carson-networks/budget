import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTransactionsPager } from "../../../hooks/useTransactionsPager.js";
import { accountQueries } from "../../../queries/accounts.js";
import { categoryQueries } from "../../../queries/categories.js";
import { nameById } from "../../../utils/nameById.js";

export function useAccountTransactionsData(accountId: string) {
  const accountsQuery = useInfiniteQuery(accountQueries.list());
  const categoriesQuery = useInfiniteQuery(categoryQueries.list());
  const accounts = accountsQuery.data;
  const categories = categoriesQuery.data;
  const account = accounts?.find(
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

  const transactionsQuery = useTransactionsPager(
    { accountId },
    { enabled: account !== undefined },
  );
  const accountNameById = useMemo(() => nameById(accounts ?? []), [accounts]);
  const categoryNameById = useMemo(
    () => nameById(categories ?? []),
    [categories],
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
