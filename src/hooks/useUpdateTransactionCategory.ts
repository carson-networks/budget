import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { ListTransactionsResponse } from "../connectRPC/types.js";

export type UpdateTransactionCategoryInput = {
  transactionId: string;
  categoryId: string;
};

// TODO(server): Regenerate the client when UpdateTransactionCategory is available.
const categoryUpdateClient: typeof transactionClient & {
  updateTransactionCategory?: (
    body: UpdateTransactionCategoryInput,
  ) => Promise<unknown>;
} = transactionClient;

export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateTransactionCategoryInput) => {
      try {
        if (!categoryUpdateClient.updateTransactionCategory) {
          throw new Error(
            "Changing transaction categories is not supported by the server yet.",
          );
        }
        await categoryUpdateClient.updateTransactionCategory(body);
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
