import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";
import type { TransactionsPageQueryKey } from "./useTransactions.js";

export type UpdateTransactionCategoryInput = {
  transactionId: string;
  categoryId: string;
};

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateTransactionCategoryInput) => {
      try {
        await transactionClient.updateTransaction({
          id: body.transactionId,
          categoryId: body.categoryId,
        });
      } catch (error) {
        throw new Error(connectErrorMessage(error));
      }
    },
    onMutate: async ({ transactionId, categoryId }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previous = queryClient.getQueriesData<ListTransactionsResponse>({
        queryKey: ["transactions"],
      });
      for (const [key, data] of previous) {
        if (!data) continue;
        const filter = key[1] as TransactionsPageQueryKey[1] | undefined;
        const movesOutOfFilter =
          filter?.categoryId !== undefined && filter.categoryId !== categoryId;
        queryClient.setQueryData<ListTransactionsResponse>(
          key,
          movesOutOfFilter &&
            data.transactions.some(({ id }) => id === transactionId)
            ? {
                ...data,
                transactions: data.transactions.filter(
                  ({ id }) => id !== transactionId,
                ),
                totalCount: data.totalCount - 1,
              }
            : {
                ...data,
                transactions: data.transactions.map((transaction) =>
                  transaction.id === transactionId
                    ? { ...transaction, categoryId }
                    : transaction,
                ),
              },
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["transactionTotals"] }),
      ]);
    },
  });
}
