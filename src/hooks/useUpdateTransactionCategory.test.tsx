import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ListTransactionsResponseSchema,
  TransactionSchema,
  type ListTransactionsResponse,
} from "../connectRPC/types.js";
import { useUpdateTransactionCategory } from "./useUpdateTransactionCategory.js";
import { transactionClient } from "../connectRPC/connect.js";

const { updateCategory } = vi.hoisted(() => ({ updateCategory: vi.fn() }));
vi.mock("../connectRPC/connect.js", () => ({
  transactionClient: { updateTransactionCategory: updateCategory },
}));

const input = { transactionId: "txn-1", categoryId: "new-category" };
const pageKey = (page: number) => ["transactions", { page, pageSize: 25 }];
const totalsKey = ["transactionTotals", 2026, 1, 2026, 12];

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const existing = create(ListTransactionsResponseSchema, {
    transactions: [
      create(TransactionSchema, {
        id: "txn-1",
        accountId: "acc-1",
        categoryId: "old-category",
        amount: "-12.50",
        transactionName: "Lunch",
        merchantName: "Cafe",
        transactionDate: { seconds: 1000n },
        createdAt: { seconds: 2000n },
      }),
      create(TransactionSchema, { id: "txn-2", categoryId: "unchanged" }),
    ],
    totalCount: 60,
    nextCursor: {
      position: 25,
      limit: 25,
      maxCreationTime: { seconds: 3000n },
    },
  });
  client.setQueryData(pageKey(1), existing);
  client.setQueryData(pageKey(2), existing);
  client.setQueryData(
    pageKey(3),
    create(ListTransactionsResponseSchema, {
      transactions: [
        create(TransactionSchema, { id: "txn-3", categoryId: "unchanged" }),
      ],
      totalCount: 60,
    }),
  );
  client.setQueryData(totalsKey, { byMonth: [] });
  const { result } = renderHook(() => useUpdateTransactionCategory(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { client, existing, result };
}

describe("useUpdateTransactionCategory", () => {
  beforeEach(() => {
    updateCategory.mockReset();
    Object.assign(transactionClient, {
      updateTransactionCategory: updateCategory,
    });
  });

  it("reports an unsupported API and rolls back when the generated client lacks the update RPC", async () => {
    Reflect.deleteProperty(transactionClient, "updateTransactionCategory");
    const { client, existing, result } = setup();
    act(() => result.current.mutate(input));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "Changing transaction categories is not supported by the server yet.",
    );
    expect(client.getQueryData(pageKey(1))).toEqual(existing);
    expect(client.getQueryData(pageKey(2))).toEqual(existing);
    expect(updateCategory).not.toHaveBeenCalled();
  });

  it("optimistically changes matching transactions in every cached page and preserves other data", async () => {
    let complete!: () => void;
    updateCategory.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    const { client, existing, result } = setup();
    act(() => result.current.mutate(input));
    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledExactlyOnceWith(input),
    );
    expect(result.current.isPending).toBe(true);
    for (const page of [1, 2]) {
      expect(client.getQueryData(pageKey(page))).toEqual({
        ...existing,
        transactions: [
          { ...existing.transactions[0], categoryId: "new-category" },
          existing.transactions[1],
        ],
      });
    }
    expect(
      client.getQueryData<ListTransactionsResponse>(pageKey(3))?.transactions[0]
        .categoryId,
    ).toBe("unchanged");
    await act(async () => {
      complete();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const key of [pageKey(1), pageKey(2), pageKey(3), totalsKey]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it.each([new Error("Save failed"), "Save failed"])(
    "rolls back all pages and exposes a readable error (%s)",
    async (failure) => {
      updateCategory.mockRejectedValue(failure);
      const { client, existing, result } = setup();
      act(() => result.current.mutate(input));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Save failed");
      expect(client.getQueryData(pageKey(1))).toEqual(existing);
      expect(client.getQueryData(pageKey(2))).toEqual(existing);
      expect(client.getQueryState(pageKey(1))?.isInvalidated).toBe(true);
      expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(true);
    },
  );

  it("can save without a cached transaction page", async () => {
    updateCategory.mockResolvedValue({});
    const { client, result } = setup();
    client.removeQueries({ queryKey: ["transactions"] });
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueriesData({ queryKey: ["transactions"] })).toEqual([]);
  });

  it("cancels an in-flight page fetch before applying the optimistic category", async () => {
    updateCategory.mockResolvedValue({});
    const { client, existing, result } = setup();
    let signal!: AbortSignal;
    const fetch = client
      .fetchQuery({
        queryKey: pageKey(1),
        queryFn: (context) => {
          signal = context.signal;
          return new Promise<ListTransactionsResponse>(() => {});
        },
      })
      .catch(() => undefined);
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    await fetch;
    expect(signal.aborted).toBe(true);
    expect(
      client.getQueryData<ListTransactionsResponse>(pageKey(1))
        ?.transactions[0],
    ).toEqual({
      ...existing.transactions[0],
      categoryId: input.categoryId,
    });
  });
});
