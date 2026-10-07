import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import {
  useAllTransactions,
  TRANSACTIONS_PAGE_SIZE,
} from "./useTransactions.js";

const { listTransactionsMock } = vi.hoisted(() => ({
  listTransactionsMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  transactionClient: {
    listTransactions: listTransactionsMock,
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useAllTransactions", () => {
  beforeEach(() => {
    listTransactionsMock.mockReset();
  });

  it("requests page N with matching UI page size offset/limit", async () => {
    const maxCreationTime = timestampFromDate(new Date("2026-01-01T00:00:00Z"));
    listTransactionsMock.mockResolvedValue({
      transactions: [
        {
          id: "txn-1",
          accountId: "acc-1",
          amount: "1",
          transactionName: "A",
        },
      ],
      totalCount: 60,
      nextCursor: {
        position: TRANSACTIONS_PAGE_SIZE,
        limit: TRANSACTIONS_PAGE_SIZE,
        maxCreationTime,
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listTransactionsMock).toHaveBeenCalledWith({
      cursor: {
        position: 0,
        limit: TRANSACTIONS_PAGE_SIZE,
        maxCreationTime: undefined,
      },
    });
    expect(result.current.totalCount).toBe(60);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.page).toBe(1);
    expect(result.current.transactions).toHaveLength(1);

    await act(async () => {
      result.current.setPage(3);
    });

    await waitFor(() =>
      expect(listTransactionsMock).toHaveBeenLastCalledWith({
        cursor: {
          position: 2 * TRANSACTIONS_PAGE_SIZE,
          limit: TRANSACTIONS_PAGE_SIZE,
          maxCreationTime,
        },
      }),
    );
  });

  it("uses server totalCount of zero without inventing a client total", async () => {
    listTransactionsMock.mockResolvedValue({
      transactions: [],
      totalCount: 0,
      nextCursor: undefined,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useAllTransactions(), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.totalCount).toBe(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.transactions).toEqual([]);
  });
  it("partitions account queries from each other and the all-transactions cache", async () => {
    const frozen = timestampFromDate(new Date("2026-01-01T00:00:00Z"));
    listTransactionsMock.mockImplementation(({ accountId }) =>
      Promise.resolve({
        transactions: [
          {
            id: "txn",
            accountId: accountId ?? "all",
            amount: "1",
            transactionName: accountId ?? "All",
          },
        ],
        totalCount: 60,
        nextCursor: { position: 25, limit: 25, maxCreationTime: frozen },
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result, rerender } = renderHook(
      ({ accountId }: { accountId?: string }) =>
        useAllTransactions(25, { accountId }),
      {
        initialProps: { accountId: undefined as string | undefined },
        wrapper: wrapper(client),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.transactions[0].transactionName).toBe("All");
    rerender({ accountId: "acc-1" });
    expect(result.current.transactions).toEqual([]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => result.current.setPage(2));
    await waitFor(() =>
      expect(listTransactionsMock).toHaveBeenLastCalledWith({
        accountId: "acc-1",
        cursor: { position: 25, limit: 25, maxCreationTime: frozen },
      }),
    );
    rerender({ accountId: "acc-2" });
    expect(result.current.transactions).toEqual([]);
    expect(result.current.page).toBe(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.transactions[0].accountId).toBe("acc-2");
    expect(listTransactionsMock).toHaveBeenLastCalledWith({
      accountId: "acc-2",
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
    expect(
      client.getQueryData(["transactions", { page: 1, pageSize: 25 }]),
    ).toBeDefined();
  });

  it("waits until the account is resolved before fetching", async () => {
    listTransactionsMock.mockResolvedValue({ transactions: [], totalCount: 0 });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result, rerender } = renderHook(
      ({ enabled }) => useAllTransactions(25, { accountId: "acc-1", enabled }),
      { initialProps: { enabled: false }, wrapper: wrapper(client) },
    );
    expect(listTransactionsMock).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listTransactionsMock).toHaveBeenCalledTimes(1);
  });

  it("retains the current account's rows while its next page loads", async () => {
    listTransactionsMock
      .mockResolvedValueOnce({
        transactions: [
          {
            id: "txn",
            accountId: "acc-1",
            amount: "1",
            transactionName: "Coffee",
          },
        ],
        totalCount: 60,
      })
      .mockImplementation(() => new Promise(() => {}));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useAllTransactions(25, { accountId: "acc-1" }),
      {
        wrapper: wrapper(client),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => result.current.setPage(2));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.transactions[0].transactionName).toBe("Coffee");
  });
});
