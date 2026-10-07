import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";

export type UpdateTransactionCategoryInput = {
  transactionId: string;
  categoryId: string;
};

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateTransactionCategoryInput) => {
      try {
        await transactionClient.updateTransactionCategory(body);
      } catch (error) {
        throw new Error(connectErrorMessage(error));
      }
    },
    onMutate: async ({ transactionId, categoryId }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previous = queryClient.getQueriesData<ListTransactionsResponse>({
        queryKey: ["transactions"],
      });
      queryClient.setQueriesData<ListTransactionsResponse>(
        { queryKey: ["transactions"] },
        (old) =>
          old
            ? {
                ...old,
                transactions: old.transactions.map((transaction) =>
                  transaction.id === transactionId
                    ? { ...transaction, categoryId }
                    : transaction,
                ),
              }
            : old,
      );
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
