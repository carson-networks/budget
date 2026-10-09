import {
  infiniteQueryOptions,
  mutationOptions,
} from "@tanstack/react-query";
import { accountClient } from "../connectRPC/connect.js";
import type {
  AccountType,
  ListAccountsCursor,
} from "../connectRPC/types.js";
import { mapAccount } from "../models";
import { invalidatesOnSettled } from "./invalidate.js";
import { rpc } from "./rpc.js";
import { transactionQueries } from "./transactions.js";

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

export const accountQueries = {
  all: () => ["accounts"] as const,

  /** Every account, mapped to the domain model (`data` is `Account[]`). */
  list: () =>
    infiniteQueryOptions({
      queryKey: [...accountQueries.all(), "list"] as const,
      queryFn: ({ pageParam }) =>
        rpc(
          accountClient.listAccounts({
            cursor: pageParam ?? { position: 0, limit: PAGE_SIZE },
          }),
        ),
      initialPageParam: undefined as ListAccountsCursor | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      select: (data) =>
        data.pages
          .flatMap((page) => page.accounts ?? [])
          .filter(Boolean)
          .map(mapAccount),
    }),
};

export const accountMutations = {
  createManual: mutationOptions({
    mutationKey: ["accounts", "createManual"],
    mutationFn: (body: CreateManualAccountInput) =>
      rpc(
        accountClient.createAccount({
          name: body.name,
          type: body.type,
          subType: body.subType,
          startingBalance: body.startingBalance,
        }),
      ),
    ...invalidatesOnSettled(accountQueries.all()),
  }),

  update: mutationOptions({
    mutationKey: ["accounts", "update"],
    mutationFn: (body: UpdateAccountInput) =>
      rpc(
        accountClient.updateAccount({
          id: body.id,
          name: body.name,
          subType: body.subType,
          startingBalance: body.startingBalance,
        }),
      ),
    ...invalidatesOnSettled(accountQueries.all()),
  }),

  /** The server cascades the account's transactions, so refetch those too. */
  delete: mutationOptions({
    mutationKey: ["accounts", "delete"],
    mutationFn: (id: string) => rpc(accountClient.deleteAccount({ id })),
    ...invalidatesOnSettled(accountQueries.all(), transactionQueries.all()),
  }),
};
