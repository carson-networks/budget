import { act, renderHook, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestQueryClient,
  createWrapper,
} from "../test/renderWithProviders.js";
import { useTransactionsPager } from "./useTransactionsPager.js";

const api = vi.hoisted(() => ({ listTransactions: vi.fn() }));
vi.mock("../connectRPC/connect.js", () => ({ transactionClient: api }));

const page = (name: string, totalCount = 60) => ({
  transactions: [
    { id: name, accountId: "acc-1", amount: "1", transactionName: name },
  ],
  totalCount,
});

function renderPager(
  route: string,
  filter: Parameters<typeof useTransactionsPager>[0] = {},
  options: Parameters<typeof useTransactionsPager>[1] = {},
) {
  return renderHook(
    () => ({
      pager: useTransactionsPager(filter, options),
      search: useLocation().search,
    }),
    { wrapper: createWrapper(createTestQueryClient(), { route }) },
  );
}

describe("useTransactionsPager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listTransactions.mockResolvedValue(page("A"));
  });

  it("starts on page 1 and derives totals from the server count", async () => {
    const { result } = renderPager("/transactions");
    await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      cursor: { position: 0, limit: 25, maxCreationTime: undefined },
    });
    const { pager } = result.current;
    expect(pager.page).toBe(1);
    expect(pager.totalCount).toBe(60);
    expect(pager.totalPages).toBe(3);
    expect(pager.transactions).toHaveLength(1);
  });

  it("reports one empty page when the server has no transactions", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    const { result } = renderPager("/transactions");
    await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));
    expect(result.current.pager.totalPages).toBe(1);
    expect(result.current.pager.transactions).toEqual([]);
  });

  it("reads the page from the URL", async () => {
    const { result } = renderPager("/transactions?page=3");
    await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      cursor: { position: 50, limit: 25, maxCreationTime: undefined },
    });
    expect(result.current.pager.page).toBe(3);
  });

  it.each(["0", "-2", "abc", "1.5", ""])(
    "treats ?page=%s as page 1",
    async (raw) => {
      const { result } = renderPager(`/transactions?page=${raw}`);
      await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));
      expect(result.current.pager.page).toBe(1);
    },
  );

  it("clamps a page beyond the last one", async () => {
    const { result } = renderPager("/transactions?page=99");
    await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));
    expect(result.current.pager.page).toBe(3);
  });

  it("setPage writes the URL, keeping other params, and page 1 clears it", async () => {
    const { result } = renderPager("/transactions?month=2025-03");
    await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));

    act(() => result.current.pager.setPage(2));
    expect(result.current.search).toBe("?month=2025-03&page=2");
    await waitFor(() =>
      expect(api.listTransactions).toHaveBeenLastCalledWith({
        cursor: { position: 25, limit: 25, maxCreationTime: undefined },
      }),
    );

    act(() => result.current.pager.setPage(1));
    expect(result.current.search).toBe("?month=2025-03");
  });

  it("freezes the window across pages of one pager", async () => {
    const maxCreationTime = { seconds: 1000n, nanos: 0 };
    api.listTransactions.mockResolvedValue({
      ...page("A"),
      nextCursor: { position: 25, limit: 25, maxCreationTime },
    });
    const { result } = renderPager("/transactions");
    await waitFor(() => expect(result.current.pager.isSuccess).toBe(true));

    act(() => result.current.pager.setPage(2));
    await waitFor(() =>
      expect(api.listTransactions).toHaveBeenLastCalledWith({
        cursor: { position: 25, limit: 25, maxCreationTime },
      }),
    );
  });

  it("waits until enabled before fetching", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useTransactionsPager({ accountId: "acc-1" }, { enabled }),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(createTestQueryClient()),
      },
    );
    expect(api.listTransactions).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledTimes(1);
  });
});
