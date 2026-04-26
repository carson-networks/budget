import { create } from "@bufbuild/protobuf";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { accountClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import {
  FAKE_ACCOUNTS,
  isFakeBudgetData,
  makeFakeAccount,
} from "../data/fakeData";
import type {
  Account,
  ListAccountsCursor,
  ListAccountsResponse,
} from "../gen/account/v1/account_pb.js";
import {
  AccountType,
  ListAccountsResponseSchema,
} from "../gen/account/v1/account_pb.js";
import type { ListTransactionsResponse } from "../gen/transaction/v1/transaction_pb.js";
import { ListTransactionsResponseSchema } from "../gen/transaction/v1/transaction_pb.js";
import type { AccountSyncSelection } from "../constants/accountSyncIntegrations";

export type { Account };
export { AccountType };

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  subType: string;
  startingBalance: string;
  /** Sync is only offered in the create-account UI; preserved for future API use. */
  sync: AccountSyncSelection;
};

const PAGE_SIZE = 50;

function useAccounts() {
  return useInfiniteQuery<
    ListAccountsResponse,
    Error,
    InfiniteData<ListAccountsResponse>,
    string[],
    ListAccountsCursor | undefined
  >({
    queryKey: ["accounts"],
    queryFn: async ({ pageParam }) => {
      if (isFakeBudgetData()) {
        if (pageParam !== undefined) {
          return create(ListAccountsResponseSchema, { accounts: [] });
        }
        return create(ListAccountsResponseSchema, {
          accounts: [...FAKE_ACCOUNTS],
          nextCursor: undefined,
        });
      }
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
      if (isFakeBudgetData()) {
        return;
      }
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
    onSuccess: (_data, variables) => {
      if (isFakeBudgetData()) {
        const account = makeFakeAccount(variables);
        queryClient.setQueryData(
          ["accounts"],
          (old: InfiniteData<ListAccountsResponse> | undefined) => {
            if (!old?.pages.length) {
              return {
                pages: [
                  create(ListAccountsResponseSchema, {
                    accounts: [account],
                    nextCursor: undefined,
                  }),
                ],
                pageParams: [undefined],
              };
            }
            const [first, ...rest] = old.pages;
            return {
              ...old,
              pages: [
                create(ListAccountsResponseSchema, {
                  accounts: [account, ...(first.accounts ?? [])],
                  nextCursor: first.nextCursor,
                }),
                ...rest,
              ],
            };
          },
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      void id;
      if (!isFakeBudgetData()) {
        throw new Error("Deleting accounts is not supported by the server yet.");
      }
    },
    onSuccess: (_data, accountId) => {
      queryClient.setQueryData(
        ["accounts"],
        (old: InfiniteData<ListAccountsResponse> | undefined) => {
          if (!old?.pages.length) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              create(ListAccountsResponseSchema, {
                accounts: page.accounts.filter((a) => a.id !== accountId),
                nextCursor: page.nextCursor,
              }),
            ),
          };
        },
      );
      queryClient.setQueryData(
        ["transactions"],
        (old: InfiniteData<ListTransactionsResponse> | undefined) => {
          if (!old?.pages.length) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              create(ListTransactionsResponseSchema, {
                transactions: (page.transactions ?? []).filter(
                  (t) => t.accountId !== accountId,
                ),
                nextCursor: page.nextCursor,
              }),
            ),
          };
        },
      );
    },
  });
}
