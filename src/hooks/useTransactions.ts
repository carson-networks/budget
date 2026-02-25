import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { components } from "../api/schema";

export type Transaction = components["schemas"]["Transaction"];
export type CreateTransactionInput = components["schemas"]["CreateTransactionInputBody"];
type ListTransactionsCursor = components["schemas"]["ListTransactionsCursor"];

export function useTransactions() {
  return useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.POST("/v1/transaction/list", {
        body: pageParam ? { cursor: pageParam } : {},
      });

      if (error) {
        throw new Error(error.detail ?? "Failed to fetch transactions");
      }

      return data;
    },
    initialPageParam: undefined as ListTransactionsCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useAllTransactions() {
  const query = useTransactions();

  const transactions =
    query.data?.pages.flatMap((page) => page.transactions) ?? [];

  return {
    ...query,
    transactions,
  };
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateTransactionInput) => {
      const { data, error } = await api.POST("/v1/transaction", { body });
      if (error) {
        throw new Error(error.detail ?? "Failed to create transaction");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
