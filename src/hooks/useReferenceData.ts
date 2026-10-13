import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Category } from "../models";
import { accountQueries } from "../queries/accounts.js";
import { categoryQueries } from "../queries/categories.js";
import { nameById } from "../utils/nameById.js";

const NO_CATEGORIES: Category[] = [];

/**
 * Accounts and categories used to label other records, with `id → name`
 * lookups and combined loading/error state. The raw queries are exposed for
 * callers that need to page them.
 */
export function useReferenceData() {
  const accountsQuery = useInfiniteQuery(accountQueries.list());
  const categoriesQuery = useInfiniteQuery(categoryQueries.list());
  const accounts = accountsQuery.data;
  const categories = categoriesQuery.data ?? NO_CATEGORIES;

  const accountNameById = useMemo(() => nameById(accounts ?? []), [accounts]);
  const categoryNameById = useMemo(() => nameById(categories), [categories]);

  return {
    accountsQuery,
    categoriesQuery,
    categories,
    accountNameById,
    categoryNameById,
    isLoading: accountsQuery.isLoading || categoriesQuery.isLoading,
    error: accountsQuery.error ?? categoriesQuery.error,
  };
}
