import type {
  MutationFunctionContext,
  QueryKey,
} from "@tanstack/react-query";

/**
 * Mutation options that refetch the given query-key prefixes once the mutation
 * settles (success or failure). Spread into `mutationOptions({...})`.
 */
export function invalidatesOnSettled(...queryKeys: readonly QueryKey[]) {
  return {
    onSettled: async (
      _data: unknown,
      _error: Error | null,
      _variables: unknown,
      _onMutateResult: unknown,
      context: MutationFunctionContext,
    ) => {
      await Promise.all(
        queryKeys.map((queryKey) =>
          context.client.invalidateQueries({ queryKey }),
        ),
      );
    },
  };
}
