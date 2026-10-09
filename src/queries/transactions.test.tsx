import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
} from "@tanstack/react-query";
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

  function render(filter: Parameters<typeof transactionQueries.list>[0] = {}) {
    return renderHook(
      // Spread so every result field is tracked and changes re-render.
      () => ({ ...useInfiniteQuery(transactionQueries.list(filter)) }),
      { wrapper: createWrapper(createTestQueryClient()) },
    );
  }

  it("requests the first batch and maps rows and the server total", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      cursor: { position: 0, limit: 25 },
    });
    expect(result.current.data).toEqual({
      transactions: [expect.objectContaining({ id: "txn-1", transactionName: "A" })],
      totalCount: 60,
    });
    expect(result.current.hasNextPage).toBe(true);
  });

  it("appends the next batch at the loaded offset with the pinned window", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    api.listTransactions.mockResolvedValue({
      transactions: [wireTxn("txn-2", "B")],
      totalCount: 60,
    });

    await act(() => result.current.fetchNextPage());
    expect(api.listTransactions).toHaveBeenLastCalledWith({
      cursor: { position: 1, limit: 25, maxCreationTime: frozen },
    });
    await waitFor(() =>
      expect(result.current.data?.transactions.map((t) => t.id)).toEqual([
        "txn-1",
        "txn-2",
      ]),
    );
  });

  it("has no next batch once everything is loaded", async () => {
    api.listTransactions.mockResolvedValue({
      transactions: [wireTxn("txn-1")],
      totalCount: 1,
    });
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("stops paging when the server returns an empty batch", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 60 });
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("sends account, month and category filters", async () => {
    const { result } = render({
      accountId: "acc-1",
      month: march,
      categoryId: "cat-1",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      accountId: "acc-1",
      categoryId: "cat-1",
      month: march,
      cursor: { position: 0, limit: 25 },
    });
  });

  it("never shows another filter's rows while loading", async () => {
    api.listTransactions
      .mockResolvedValueOnce({ transactions: [wireTxn("txn", "Mine")], totalCount: 1 })
      .mockImplementation(() => new Promise(() => {}));
    const { result, rerender } = renderHook(
      ({ accountId }) =>
        useInfiniteQuery(transactionQueries.list({ accountId })),
      {
        initialProps: { accountId: "acc-1" },
        wrapper: createWrapper(createTestQueryClient()),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ accountId: "acc-2" });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe("transactionMutations.updateCategory", () => {
  const input = { transactionId: "txn-1", categoryId: "new-category" };
  const rpcInput = { id: "txn-1", categoryId: "new-category" };
  const listKey = (filter: object = {}) => ["transactions", "list", filter];
  const accountListKey = listKey({ accountId: "acc-1" });
  const infinite = (...pages: ListTransactionsResponse[]) => ({
    pages,
    pageParams: pages.map(() => undefined),
  });
  const otherKey = listKey({ accountId: "acc-2" });
  const totalsKey = ["transactions", "totals", 2026, 1, 2026, 12];

  beforeEach(() => vi.resetAllMocks());

  function setup() {
    const client = createTestQueryClient();
    const page1 = create(ListTransactionsResponseSchema, {
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
    const page2 = create(ListTransactionsResponseSchema, {
      transactions: [
        create(TransactionSchema, { id: "txn-3", categoryId: "unchanged" }),
      ],
      totalCount: 60,
    });
    const existing = infinite(page1, page2);
    client.setQueryData(listKey(), existing);
    client.setQueryData(accountListKey, existing);
    client.setQueryData(
      otherKey,
      infinite(
        create(ListTransactionsResponseSchema, {
          transactions: [
            create(TransactionSchema, { id: "txn-9", categoryId: "unchanged" }),
          ],
          totalCount: 1,
        }),
      ),
    );
    client.setQueryData(totalsKey, { byMonth: [] });
    const { result } = renderHook(
      () => useMutation(transactionMutations.updateCategory),
      { wrapper: createWrapper(client) },
    );
    return { client, existing, page1, page2, result };
  }

  it("optimistically recategorizes the row in every cached list, then refetches lists and totals", async () => {
    let complete!: () => void;
    api.updateTransaction.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    const { client, page1, page2, result } = setup();
    act(() => result.current.mutate(input));
    await waitFor(() =>
      expect(api.updateTransaction).toHaveBeenCalledExactlyOnceWith(rpcInput),
    );
    expect(result.current.isPending).toBe(true);
    for (const key of [listKey(), accountListKey]) {
      expect(client.getQueryData(key)).toEqual(
        infinite(
          {
            ...page1,
            transactions: [
              { ...page1.transactions[0], categoryId: "new-category" },
              page1.transactions[1],
            ],
          } as ListTransactionsResponse,
          page2,
        ),
      );
    }
    expect(
      client.getQueryData<InfiniteData<ListTransactionsResponse>>(otherKey)
        ?.pages[0].transactions[0].categoryId,
    ).toBe("unchanged");

    await act(async () => complete());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const key of [listKey(), accountListKey, otherKey, totalsKey]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it.each([new Error("Save failed"), "Save failed"])(
    "rolls back every list and exposes a readable error (%s)",
    async (failure) => {
      api.updateTransaction.mockRejectedValue(failure);
      const { client, existing, result } = setup();
      act(() => result.current.mutate(input));
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Save failed");
      expect(client.getQueryData(listKey())).toEqual(existing);
      expect(client.getQueryData(accountListKey)).toEqual(existing);
      expect(client.getQueryState(listKey())?.isInvalidated).toBe(true);
      expect(client.getQueryState(totalsKey)?.isInvalidated).toBe(true);
    },
  );

  it("can save without a cached transaction list", async () => {
    api.updateTransaction.mockResolvedValue({});
    const { client, result } = setup();
    client.removeQueries({ queryKey: ["transactions"] });
    await act(() => result.current.mutateAsync(input));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueriesData({ queryKey: ["transactions"] })).toEqual([]);
  });

  it("cancels an in-flight list fetch before applying the optimistic category", async () => {
    api.updateTransaction.mockResolvedValue({});
    const { client, page1, result } = setup();
    let signal!: AbortSignal;
    const fetch = client
      .fetchQuery({
        queryKey: listKey(),
        queryFn: (context) => {
          signal = context.signal;
          return new Promise<InfiniteData<ListTransactionsResponse>>(() => {});
        },
      })
      .catch(() => undefined);
    await act(() => result.current.mutateAsync(input));
    await fetch;
    expect(signal.aborted).toBe(true);
    expect(
      client.getQueryData<InfiniteData<ListTransactionsResponse>>(listKey())
        ?.pages[0].transactions[0],
    ).toEqual({ ...page1.transactions[0], categoryId: input.categoryId });
  });

  it("drops the transaction from category-filtered lists it moves out of", async () => {
    api.updateTransaction.mockReturnValue(new Promise<void>(() => {}));
    const { client, existing, page1, page2, result } = setup();
    const filteredKey = (categoryId: string) =>
      listKey({ categoryId, month: { year: 2026, month: 1 } });
    client.setQueryData(filteredKey("old-category"), existing);
    client.setQueryData(filteredKey("new-category"), existing);
    act(() => result.current.mutate(input));
    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(client.getQueryData(filteredKey("old-category"))).toEqual(
      infinite(
        {
          ...page1,
          transactions: [page1.transactions[1]],
          totalCount: 59,
        } as ListTransactionsResponse,
        { ...page2, totalCount: 59 } as ListTransactionsResponse,
      ),
    );
    expect(
      client.getQueryData<InfiniteData<ListTransactionsResponse>>(
        filteredKey("new-category"),
      )?.pages[0].transactions[0].categoryId,
    ).toBe("new-category");
  });
});
