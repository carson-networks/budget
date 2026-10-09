import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { useMutation, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetTransactionTotalsResponseSchema,
  ListTransactionsResponseSchema,
  TransactionSchema,
  TransactionTotalsCategorySchema,
  TransactionTotalsMonthSchema,
  type ListTransactionsResponse,
} from "../connectRPC/types.js";
import {
  createTestQueryClient,
  createWrapper,
} from "../test/renderWithProviders.js";
import {
  TRANSACTIONS_PAGE_SIZE,
  transactionMutations,
  transactionQueries,
  type TransactionWindows,
} from "./transactions.js";

const api = vi.hoisted(() => ({
  listTransactions: vi.fn(),
  getTransactionTotals: vi.fn(),
  updateTransaction: vi.fn(),
}));
vi.mock("../connectRPC/connect.js", () => ({ transactionClient: api }));

const march = { year: 2025, month: 3 };

describe("transactionQueries.totals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getTransactionTotals.mockResolvedValue(
      create(GetTransactionTotalsResponseSchema, {
        byMonth: [
          create(TransactionTotalsMonthSchema, {
            year: 2025,
            month: 3,
            byCategory: [
              create(TransactionTotalsCategorySchema, {
                categoryId: "food",
                total: "-42.50",
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("fetches and maps totals for the range", async () => {
    const { result } = renderHook(
      () => useQuery(transactionQueries.totals(march, march)),
      { wrapper: createWrapper(createTestQueryClient()) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getTransactionTotals).toHaveBeenCalledWith({
      startMonth: 3,
      startYear: 2025,
      endMonth: 3,
      endYear: 2025,
    });
    expect(result.current.data).toEqual({
      byMonth: [
        {
          year: 2025,
          month: 3,
          byCategory: [{ categoryId: "food", total: "-42.50" }],
        },
      ],
    });
  });
});

describe("transactionQueries.list", () => {
  const frozen = timestampFromDate(new Date("2026-01-01T00:00:00Z"));
  const wireTxn = (id: string, name = id) => ({
    id,
    accountId: "acc-1",
    amount: "1",
    transactionName: name,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    api.listTransactions.mockResolvedValue({
      transactions: [wireTxn("txn-1", "A")],
      totalCount: 60,
      nextCursor: {
        position: TRANSACTIONS_PAGE_SIZE,
        limit: TRANSACTIONS_PAGE_SIZE,
        maxCreationTime: frozen,
      },
    });
  });

  function render(
    params: Parameters<typeof transactionQueries.list>[0],
    windows: TransactionWindows = new Map(),
  ) {
    return renderHook(
      (p) => useQuery(transactionQueries.list(p, windows)),
      {
        initialProps: params,
        wrapper: createWrapper(createTestQueryClient()),
      },
    );
  }

  it("requests the offset for the page and maps rows and the server total", async () => {
    const { result } = render({ page: 1, pageSize: 25 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
    expect(result.current.data).toEqual({
      transactions: [expect.objectContaining({ id: "txn-1", transactionName: "A" })],
      totalCount: 60,
    });
  });

  it("pins the window from the first response and reuses it for later pages", async () => {
    const windows: TransactionWindows = new Map();
    const { result, rerender } = render({ page: 1, pageSize: 25 }, windows);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(windows.size).toBe(1);

    rerender({ page: 3, pageSize: 25 });
    await waitFor(() =>
      expect(api.listTransactions).toHaveBeenLastCalledWith({
        cursor: { position: 50, limit: 25, maxCreationTime: frozen },
      }),
    );
  });

  it("keeps separate windows per filter", async () => {
    const windows: TransactionWindows = new Map();
    const { result, rerender } = render({ page: 1, pageSize: 25 }, windows);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ page: 2, pageSize: 25, accountId: "acc-1" });
    await waitFor(() =>
      expect(api.listTransactions).toHaveBeenLastCalledWith({
        accountId: "acc-1",
        cursor: { position: 25, limit: 25, maxCreationTime: undefined },
      }),
    );
  });

  it("sends month and category filters", async () => {
    const { result } = render({
      page: 1,
      pageSize: 25,
      month: march,
      categoryId: "cat-1",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      categoryId: "cat-1",
      month: march,
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
  });

  it("keeps the previous page while the same filter's next page loads", async () => {
    api.listTransactions
      .mockResolvedValueOnce({
        transactions: [wireTxn("txn", "Coffee")],
        totalCount: 60,
      })
      .mockImplementation(() => new Promise(() => {}));
    const { result, rerender } = render({
      page: 1,
      pageSize: 25,
      accountId: "acc-1",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ page: 2, pageSize: 25, accountId: "acc-1" });
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data?.transactions[0].transactionName).toBe("Coffee");
  });

  it("never shows another filter's rows while loading", async () => {
    api.listTransactions
      .mockResolvedValueOnce({ transactions: [wireTxn("txn", "Mine")], totalCount: 1 })
      .mockImplementation(() => new Promise(() => {}));
    const { result, rerender } = render({
      page: 1,
      pageSize: 25,
      accountId: "acc-1",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ page: 1, pageSize: 25, accountId: "acc-2" });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
  });
});

describe("transactionMutations.updateCategory", () => {
  const input = { transactionId: "txn-1", categoryId: "new-category" };
  const rpcInput = { id: "txn-1", categoryId: "new-category" };
  const pageKey = (page: number) => ["transactions", "list", { page, pageSize: 25 }];
  const accountPageKey = [
    "transactions",
    "list",
    { page: 1, pageSize: 25, accountId: "acc-1" },
  ];
  const totalsKey = ["transactions", "totals", 2026, 1, 2026, 12];

  beforeEach(() => vi.resetAllMocks());

  function setup() {
    const client = createTestQueryClient();
    const existing = create(ListTransactionsResponseSchema, {
      transactions: [
        create(TransactionSchema, {
          id: "txn-1",
          accountId: "acc-1",
          categoryId: "old-category",
          amount: "-12.50",
          transactionName: "Lunch",
        }),
        create(TransactionSchema, { id: "txn-2", categoryId: "unchanged" }),
      ],
      totalCount: 60,
      nextCursor: { position: 25, limit: 25, maxCreationTime: { seconds: 3000n } },
    });
    client.setQueryData(pageKey(1), existing);
    client.setQueryData(pageKey(2), existing);
    client.setQueryData(accountPageKey, existing);
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
    const { result } = renderHook(
      () => useMutation(transactionMutations.updateCategory),
      { wrapper: createWrapper(client) },
    );
    return { client, existing, result };
  }

  it("optimistically recategorizes every cached page that holds the row, then refetches lists and totals", async () => {
    let complete!: () => void;
    api.updateTransaction.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    const { client, existing, result } = setup();
    act(() => result.current.mutate(input));
    await waitFor(() =>
      expect(api.updateTransaction).toHaveBeenCalledExactlyOnceWith(rpcInput),
    );
    expect(result.current.isPending).toBe(true);
    for (const key of [pageKey(1), pageKey(2), accountPageKey]) {
      expect(client.getQueryData(key)).toEqual({
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

    await act(async () => complete());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const key of [pageKey(1), pageKey(2), pageKey(3), accountPageKey, totalsKey]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it.each([new Error("Save failed"), "Save failed"])(
    "rolls back all pages and exposes a readable error (%s)",
    async (failure) => {
      api.updateTransaction.mockRejectedValue(failure);
      const { client, existing, result } = setup();
      act(() => result.current.mutate(input));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Save failed");
      expect(client.getQueryData(pageKey(1))).toEqual(existing);
      expect(client.getQueryData(pageKey(2))).toEqual(existing);
      expect(client.getQueryData(accountPageKey)).toEqual(existing);
      expect(client.getQueryState(pageKey(1))?.isInvalidated).toBe(true);
      expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(true);
    },
  );

  it("can save without a cached transaction page", async () => {
    api.updateTransaction.mockResolvedValue({});
    const { client, result } = setup();
    client.removeQueries({ queryKey: ["transactions"] });
    await act(() => result.current.mutateAsync(input));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueriesData({ queryKey: ["transactions"] })).toEqual([]);
  });

  it("cancels an in-flight page fetch before applying the optimistic category", async () => {
    api.updateTransaction.mockResolvedValue({});
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
    await act(() => result.current.mutateAsync(input));
    await fetch;
    expect(signal.aborted).toBe(true);
    expect(
      client.getQueryData<ListTransactionsResponse>(pageKey(1))?.transactions[0],
    ).toEqual({ ...existing.transactions[0], categoryId: input.categoryId });
  });

  it("drops the transaction from category-filtered pages it moves out of", async () => {
    api.updateTransaction.mockReturnValue(new Promise<void>(() => {}));
    const { client, existing, result } = setup();
    const filteredKey = (categoryId: string) => [
      "transactions",
      "list",
      { page: 1, pageSize: 25, categoryId, month: { year: 2026, month: 1 } },
    ];
    client.setQueryData(filteredKey("old-category"), existing);
    client.setQueryData(filteredKey("new-category"), existing);
    act(() => result.current.mutate(input));
    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(client.getQueryData(filteredKey("old-category"))).toEqual({
      ...existing,
      transactions: [existing.transactions[1]],
      totalCount: 59,
    });
    expect(
      client.getQueryData<ListTransactionsResponse>(filteredKey("new-category"))
        ?.transactions[0].categoryId,
    ).toBe("new-category");
  });
});
