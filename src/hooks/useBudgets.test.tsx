import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BudgetSchema,
  ListBudgetsResponseSchema,
} from "../connectRPC/types.js";
import { useBudgetsForRange, useSetBudget } from "./useBudgets.js";

const { listBudgetsMock, setBudgetMock } = vi.hoisted(() => ({
  listBudgetsMock: vi.fn(),
  setBudgetMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  budgetClient: {
    listBudgets: listBudgetsMock,
    setBudget: setBudgetMock,
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useBudgetsForRange", () => {
  beforeEach(() => {
    listBudgetsMock.mockReset();
    listBudgetsMock.mockResolvedValue(
      create(ListBudgetsResponseSchema, {
        budgets: [
          create(BudgetSchema, {
            categoryId: "cat-1",
            year: 2025,
            month: 3,
            amount: "100",
          }),
        ],
      }),
    );
  });

  it("lists budgets for the requested range and maps domain rows", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () =>
        useBudgetsForRange(
          { year: 2025, month: 3 },
          { year: 2025, month: 3 },
        ),
      { wrapper: wrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listBudgetsMock).toHaveBeenCalledWith({
      startMonth: 3,
      startYear: 2025,
      endMonth: 3,
      endYear: 2025,
    });
    expect(result.current.budgets).toEqual([
      {
        categoryId: "cat-1",
        year: 2025,
        month: 3,
        amount: "100",
      },
    ]);
  });
});

describe("useSetBudget", () => {
  beforeEach(() => {
    setBudgetMock.mockReset();
    setBudgetMock.mockResolvedValue({});
  });

  it("calls setBudget and invalidates budget queries", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSetBudget(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        categoryId: "cat-1",
        year: 2025,
        month: 3,
        amount: "200",
        overwriteFutureMonths: false,
      });
    });

    expect(setBudgetMock).toHaveBeenCalledWith({
      categoryId: "cat-1",
      year: 2025,
      month: 3,
      amount: "200",
      overwriteFutureMonths: false,
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["budgets"] });
    });
  });

  it("surfaces connect errors from setBudget", async () => {
    setBudgetMock.mockRejectedValue(new Error("set failed"));
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const { result } = renderHook(() => useSetBudget(), {
      wrapper: wrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        categoryId: "cat-1",
        year: 2025,
        month: 3,
        amount: "200",
        overwriteFutureMonths: false,
      }),
    ).rejects.toThrow("set failed");
  });
});
