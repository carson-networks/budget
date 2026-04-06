import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountClient } from "../api/connect";
import { connectErrorMessage } from "../api/connectError";
import type { MessageInitShape } from "@bufbuild/protobuf";
import {
  type Account,
  CreateAccountRequestSchema,
} from "../gen/account/v1/account_pb.js";

export type { Account };
export type CreateAccountInput = MessageInitShape<typeof CreateAccountRequestSchema>;

const PAGE_SIZE = 50;

export function useAccounts() {
  return useInfiniteQuery({
    queryKey: ["accounts"],
    queryFn: async ({ pageParam }) => {
      try {
        return await accountClient.listAccounts({
          cursor: {
            position: pageParam?.position ?? 0,
            limit: pageParam?.limit ?? PAGE_SIZE,
          },
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to load accounts"));
      }
    },
    initialPageParam: undefined as { position: number; limit: number } | undefined,
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
      try {
        await accountClient.createAccount(body);
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to create account"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
