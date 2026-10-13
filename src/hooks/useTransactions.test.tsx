import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestQueryClient,
  createWrapper,
} from "../test/renderWithProviders.js";
import { useTransactions } from "./useTransactions.js";

const api = vi.hoisted(() => ({ listTransactions: vi.fn() }));
vi.mock("../connectRPC/connect.js", () => ({ transactionClient: api }));

const batch = (name: string, totalCount = 60) => ({
  transactions: [
    { id: name, accountId: "acc-1", amount: "1", transactionName: name },
  ],
  totalCount,
});

function renderTransactions(
  filter: Parameters<typeof useTransactions>[0] = {},
  options: Parameters<typeof useTransactions>[1] = {},
) {
  return renderHook(() => useTransactions(filter, options), {
    wrapper: createWrapper(createTestQueryClient()),
  });
}

describe("useTransactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listTransactions.mockResolvedValue(batch("A"));
  });

  it("loads the first batch with the server count", async () => {
    const { result } = renderTransactions();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listTransactions).toHaveBeenCalledWith({
      cursor: { position: 0, limit: 25 },
    });
    expect(result.current.totalCount).toBe(60);
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("is empty when the server has no transactions", async () => {
    api.listTransactions.mockResolvedValue({ transactions: [], totalCount: 0 });
    const { result } = renderTransactions();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.transactions).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("loadMore appends the next batch behind the first", async () => {
    const maxCreationTime = { seconds: 1000n, nanos: 0 };
    api.listTransactions.mockResolvedValueOnce({
      ...batch("A"),
      nextCursor: { position: 1, limit: 25, maxCreationTime },
    });
    const { result } = renderTransactions();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    api.listTransactions.mockResolvedValue(batch("B"));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.transactions).toHaveLength(2));
    expect(api.listTransactions).toHaveBeenLastCalledWith({
      cursor: { position: 1, limit: 25, maxCreationTime },
    });
    expect(result.current.transactions.map((t) => t.id)).toEqual(["A", "B"]);
  });

  it("reports a failed loadMore separately and keeps the loaded rows", async () => {
    const { result } = renderTransactions();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    api.listTransactions.mockRejectedValue(new Error("Network down"));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.loadMoreError).not.toBeNull());
    expect(result.current.loadMoreError?.message).toBe("Network down");
    expect(result.current.error).toBeNull();
    expect(result.current.transactions).toHaveLength(1);
  });

  it("reports an initial load failure as error", async () => {
    api.listTransactions.mockRejectedValue(new Error("Boom"));
    const { result } = renderTransactions();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe("Boom");
    expect(result.current.loadMoreError).toBeNull();
  });

  it("waits until enabled before fetching", async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useTransactions({ accountId: "acc-1" }, { enabled }),
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
