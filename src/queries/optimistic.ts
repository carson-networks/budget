import type {
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";

/**
 * Optimistically rewrites every cached query matching `filters` and returns a
 * `rollback` that restores the previous snapshot. Return the result from
 * `onMutate`; call `onMutateResult?.rollback()` from `onError`.
 *
 * Use sparingly — most mutations should just invalidate (`invalidatesOnSettled`).
 */
export async function patchQueries<TData>(
  client: QueryClient,
  filters: QueryFilters,
  patch: (data: TData, queryKey: QueryKey) => TData,
) {
  await client.cancelQueries(filters);
  const snapshot = client.getQueriesData<TData>(filters);
  for (const [queryKey, data] of snapshot) {
    if (data) client.setQueryData<TData>(queryKey, patch(data, queryKey));
  }
  return {
    rollback: () => {
      for (const [queryKey, data] of snapshot) {
        client.setQueryData(queryKey, data);
      }
    },
  };
}
