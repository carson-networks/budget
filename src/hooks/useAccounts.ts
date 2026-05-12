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
import { mapAccount, type Account } from "../models";
import {
  prependToInfiniteList,
} from "./cachePatches.js";

const PAGE_SIZE = 50;

export type CreateManualAccountInput = {
  name: string;
  type: AccountType;
  subType: string;
  startingBalance: string;
};

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
