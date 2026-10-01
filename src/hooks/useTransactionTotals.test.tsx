import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetTransactionTotalsResponseSchema,
  TransactionTotalsCategorySchema,
  TransactionTotalsMonthSchema,
} from "../connectRPC/types.js";
import { useTransactionTotalsForRange } from "./useTransactionTotals.js";

const { getTransactionTotalsMock } = vi.hoisted(() => ({
  getTransactionTotalsMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  transactionClient: {
    getTransactionTotals: getTransactionTotalsMock,
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useTransactionTotalsForRange", () => {
  beforeEach(() => {
    getTransactionTotalsMock.mockReset();
    getTransactionTotalsMock.mockResolvedValue(
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
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () =>
        useTransactionTotalsForRange(
          { year: 2025, month: 3 },
          { year: 2025, month: 3 },
        ),
      { wrapper: wrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTransactionTotalsMock).toHaveBeenCalledWith({
      startMonth: 3,
      startYear: 2025,
      endMonth: 3,
      endYear: 2025,
    });
    expect(result.current.totals).toEqual({
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
