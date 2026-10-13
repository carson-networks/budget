import { useEffect } from "react";
import { useReferenceData } from "../../../hooks/useReferenceData.js";
import { useTransactions } from "../../../hooks/useTransactions.js";

export function useAccountTransactionsData(accountId: string) {
  const { accountsQuery, categoriesQuery, accountNameById, categoryNameById } =
    useReferenceData();
  const account = accountsQuery.data?.find(
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

  const transactionsQuery = useTransactions(
    { accountId },
    { enabled: account !== undefined },
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
        (categoriesQuery.isLoading || transactionsQuery.isLoading)),
    error:
      accountsQuery.error ?? categoriesQuery.error ?? transactionsQuery.error,
  };
}
