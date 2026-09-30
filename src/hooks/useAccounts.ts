import { create } from "@bufbuild/protobuf";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { accountClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { Account as WireAccount } from "../connectRPC/types.js";
import {
  AccountSchema,
  AccountType,
  type ListAccountsCursor,
  type ListAccountsResponse,
} from "../connectRPC/types.js";
import {
  balanceAfterStartingChange,
  mapAccount,
  type Account,
} from "../models";
import {
  prependToInfiniteList,
  removeFromInfiniteList,
  updateInInfiniteList,
} from "./cachePatches.js";

const PAGE_SIZE = 50;

export type CreateManualAccountInput = {
  name: string;
  type: AccountType;
  subType: string;
  startingBalance: string;
};

export type UpdateAccountInput = {
  id: string;
  name: string;
  subType: string;
  startingBalance: string;
};

function findWireAccount(
  data: InfiniteData<ListAccountsResponse> | undefined,
  id: string,
): WireAccount | undefined {
  for (const page of data?.pages ?? []) {
    const found = (page.accounts ?? []).find((a) => a.id === id);
    if (found) return found;
  }
  return undefined;
}

export function useAllAccounts() {
  const query = useInfiniteQuery<
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

  const accounts: Account[] =
    query.data?.pages.flatMap((page) =>
      (page.accounts ?? []).filter(Boolean),
    ).map(mapAccount) ?? [];

  return {
    ...query,
    accounts,
  };
}

export function useCreateManualAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateManualAccountInput) => {
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
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previous = queryClient.getQueryData<
        InfiniteData<ListAccountsResponse>
      >(["accounts"]);

      const optimistic: WireAccount = create(AccountSchema, {
        id: `optimistic-${crypto.randomUUID()}`,
        name: variables.name,
        type: variables.type,
        subType: variables.subType,
        balance: variables.startingBalance,
        startingBalance: variables.startingBalance,
      });

      queryClient.setQueryData(
        ["accounts"],
        (old: InfiniteData<ListAccountsResponse> | undefined) =>
          prependToInfiniteList(old, optimistic),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["accounts"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateAccountInput) => {
      try {
        await accountClient.updateAccount({
          id: body.id,
          name: body.name,
          subType: body.subType,
          startingBalance: body.startingBalance,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previous = queryClient.getQueryData<
        InfiniteData<ListAccountsResponse>
      >(["accounts"]);

      const existing = findWireAccount(previous, variables.id);
      if (existing) {
        const optimistic = create(AccountSchema, {
          ...existing,
          name: variables.name,
          subType: variables.subType,
          startingBalance: variables.startingBalance,
          balance: balanceAfterStartingChange(
            existing.balance,
            existing.startingBalance,
            variables.startingBalance,
          ),
        });
        queryClient.setQueryData(
          ["accounts"],
          (old: InfiniteData<ListAccountsResponse> | undefined) =>
            updateInInfiniteList(
              old,
              (a) => a.id === variables.id,
              optimistic,
            ),
        );
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["accounts"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await accountClient.deleteAccount({ id });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onMutate: async (accountId) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      const previous = queryClient.getQueryData<
        InfiniteData<ListAccountsResponse>
      >(["accounts"]);

      queryClient.setQueryData(
        ["accounts"],
        (old: InfiniteData<ListAccountsResponse> | undefined) =>
          removeFromInfiniteList(old, (a) => a.id === accountId),
      );

      return { previous };
    },
    onError: (_err, _accountId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["accounts"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      // Server cascades related transactions; refresh if/when that list is cached.
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
