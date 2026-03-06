import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { components } from "../api/schema";

export type Account = components["schemas"]["Account"];
export type CreateAccountInput = components["schemas"]["CreateAccountBody"];

const PAGE_SIZE = 50;

export function useAccounts() {
  return useInfiniteQuery({
    queryKey: ["accounts"],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET("/v1/accounts", {
        params: {
          query: pageParam ?? { limit: PAGE_SIZE },
        },
      });

      if (error) {
        throw new Error(error.detail ?? "Failed to fetch accounts");
      }

      return data;
    },
    initialPageParam: undefined as { position?: number; limit?: number } | undefined,
    getNextPageParam: (lastPage) => {
      const cursor = lastPage.nextCursor;
      if (!cursor) return undefined;
      return { position: cursor.position, limit: cursor.limit };
    },
  });
}

export function useAllAccounts() {
  const query = useAccounts();

  const accounts = (
    query.data?.pages.flatMap((page) => page.accounts ?? []) ?? []
  ).filter((a): a is Account => a != null);

  return {
    ...query,
    accounts,
  };
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateAccountInput) => {
      const { error } = await api.POST("/v1/accounts", { body });
      if (error) {
        throw new Error(error.detail ?? "Failed to create account");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
