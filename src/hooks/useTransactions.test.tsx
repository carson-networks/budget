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
    const maxCreationTime = timestampFromDate(
      new Date("2026-01-01T00:00:00Z"),
    );
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
});
