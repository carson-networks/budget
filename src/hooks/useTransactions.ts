import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { transactionClient } from "../api/connect";
import { connectErrorMessage } from "../api/connectError";
import type { ListTransactionsCursor } from "../gen/transaction/v1/transaction_pb.js";
import type { Transaction } from "../gen/transaction/v1/transaction_pb.js";

export type { Transaction };

/** Form payload from the UI; converted to a protobuf request in the mutation. */
export type CreateTransactionInput = {
  transactionName: string;
  accountId: string;
  categoryId: string;
  amount: string;
  /** ISO 8601 datetime string */
  transactionDateIso: string;
};

export function useTransactions() {
  return useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: async ({ pageParam }) => {
      try {
        return await transactionClient.listTransactions({
          cursor: pageParam,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to load transactions"));
      }
    },
    initialPageParam: undefined as ListTransactionsCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

async function loadTransactionPage(cursor?: ListTransactionsCursor) {
  try {
    return await transactionClient.listTransactions({
      cursor,
    });
  } catch (e) {
    throw new Error(connectErrorMessage(e, "Failed to load transactions"));
  }
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ["transactions", "all"],
    queryFn: async (): Promise<Transaction[]> => {
      const all: Transaction[] = [];
      let cursor: ListTransactionsCursor | undefined;
      do {
        const page = await loadTransactionPage(cursor);
        all.push(...(page.transactions ?? []));
        cursor = page.nextCursor ?? undefined;
      } while (cursor !== undefined);
      return all;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateTransactionInput) => {
      try {
        await transactionClient.createTransaction({
          accountId: body.accountId,
          categoryId: body.categoryId,
          amount: body.amount,
          transactionName: body.transactionName,
          transactionDate: timestampFromDate(new Date(body.transactionDateIso)),
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to create transaction"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"], exact: false });
    },
  });
}
