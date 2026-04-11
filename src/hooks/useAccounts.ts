import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { accountClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import type {
  Account,
  ListAccountsCursor,
  ListAccountsResponse,
} from "../gen/account/v1/account_pb.js";
import { AccountType } from "../gen/account/v1/account_pb.js";

export type { Account };
export { AccountType };

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  subType: string;
  startingBalance: string;
};

const PAGE_SIZE = 50;

export function useAccounts() {
  return useInfiniteQuery<
    ListAccountsResponse,
    Error,
    InfiniteData<ListAccountsResponse>,
    string[],
    ListAccountsCursor | undefined
  >({
    queryKey: ["accounts"],
    queryFn: async ({ pageParam }) => {
      try {
        return await accountClient.listAccounts({
          cursor:
            pageParam === undefined
              ? { position: 0, limit: PAGE_SIZE }
              : pageParam,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
        await accountClient.createAccount({
          name: body.name,
          type: body.type,
          subType: body.subType,
          startingBalance: body.startingBalance,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
