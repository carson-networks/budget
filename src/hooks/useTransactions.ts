import { create } from "@bufbuild/protobuf";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import {
  FAKE_TRANSACTIONS,
  isFakeBudgetData,
  makeFakeTransaction,
} from "../data/fakeData";
import type {
  ListTransactionsCursor,
  ListTransactionsResponse,
  Transaction,
} from "../gen/transaction/v1/transaction_pb.js";
import { ListTransactionsResponseSchema } from "../gen/transaction/v1/transaction_pb.js";

export type { Transaction };

export type CreateTransactionInput = {
  transactionName: string;
  accountId: string;
  categoryId: string;
  amount: string;
  /** ISO date string */
  transactionDate: string;
};

const PAGE_SIZE = 50;

export function useTransactions() {
  return useInfiniteQuery<
    ListTransactionsResponse,
    Error,
    InfiniteData<ListTransactionsResponse>,
    string[],
    ListTransactionsCursor | undefined
  >({
    queryKey: ["transactions"],
    queryFn: async ({ pageParam }) => {
      if (isFakeBudgetData()) {
        if (pageParam !== undefined) {
          return create(ListTransactionsResponseSchema, { transactions: [] });
        }
        return create(ListTransactionsResponseSchema, {
          transactions: [...FAKE_TRANSACTIONS],
          nextCursor: undefined,
        });
      }
      try {
        return await transactionClient.listTransactions({
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

export function useAllTransactions() {
  const query = useTransactions();

  const transactions = (
    query.data?.pages.flatMap((page) => page.transactions ?? []) ?? []
  ).filter((t): t is Transaction => t != null);

  return {
    ...query,
    transactions,
  };
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateTransactionInput) => {
      if (isFakeBudgetData()) {
        return;
      }
      try {
        return await transactionClient.createTransaction({
          accountId: body.accountId,
          categoryId: body.categoryId,
          amount: body.amount,
          transactionName: body.transactionName,
          transactionDate: timestampFromDate(new Date(body.transactionDate)),
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSuccess: (_data, variables) => {
      if (isFakeBudgetData()) {
        const transaction = makeFakeTransaction(variables);
        queryClient.setQueryData(
          ["transactions"],
          (old: InfiniteData<ListTransactionsResponse> | undefined) => {
            if (!old?.pages.length) {
              return {
                pages: [
                  create(ListTransactionsResponseSchema, {
                    transactions: [transaction],
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
                create(ListTransactionsResponseSchema, {
                  transactions: [transaction, ...(first.transactions ?? [])],
                  nextCursor: first.nextCursor,
                }),
                ...rest,
              ],
            };
          },
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      void id;
      if (!isFakeBudgetData()) {
        throw new Error("Deleting transactions is not supported by the server yet.");
      }
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData(
        ["transactions"],
        (old: InfiniteData<ListTransactionsResponse> | undefined) => {
          if (!old?.pages.length) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              create(ListTransactionsResponseSchema, {
                transactions: (page.transactions ?? []).filter((t) => t.id !== id),
                nextCursor: page.nextCursor,
              }),
            ),
          };
        },
      );
    },
  });
}
