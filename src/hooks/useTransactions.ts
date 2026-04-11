import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import type {
  ListTransactionsCursor,
  ListTransactionsResponse,
  Transaction,
} from "../gen/transaction/v1/transaction_pb.js";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
