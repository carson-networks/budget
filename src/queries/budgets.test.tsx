import { create } from "@bufbuild/protobuf";
import { useMutation, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetSchema, ListBudgetsResponseSchema } from "../connectRPC/types.js";
import {
  createTestQueryClient,
  createWrapper,
} from "../test/renderWithProviders.js";
import { budgetMutations, budgetQueries } from "./budgets.js";

const api = vi.hoisted(() => ({
  listBudgets: vi.fn(),
  setBudget: vi.fn(),
}));
vi.mock("../connectRPC/connect.js", () => ({ budgetClient: api }));

const march = { year: 2025, month: 3 };

describe("budgetQueries.range", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listBudgets.mockResolvedValue(
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

  it("lists budgets for the inclusive range and maps domain rows", async () => {
    const { result } = renderHook(
      () => useQuery(budgetQueries.range(march, { year: 2025, month: 5 })),
      { wrapper: createWrapper(createTestQueryClient()) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listBudgets).toHaveBeenCalledWith({
      startMonth: 3,
      startYear: 2025,
      endMonth: 5,
      endYear: 2025,
    });
    expect(result.current.data).toEqual([
      { categoryId: "cat-1", year: 2025, month: 3, amount: "100" },
    ]);
  });

  it("keys each range separately under the budgets root", () => {
    const a = budgetQueries.range(march, march).queryKey;
    const b = budgetQueries.range(march, { year: 2025, month: 4 }).queryKey;
    expect(a).not.toEqual(b);
    expect(a.slice(0, 1)).toEqual(budgetQueries.all());
  });
});

describe("budgetMutations.set", () => {
  const vars = {
    categoryId: "cat-1",
    year: 2025,
    month: 3,
    amount: "200",
    overwriteFutureMonths: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    api.setBudget.mockResolvedValue({});
  });

  it("sends the budget and refetches budget ranges", async () => {
    const client = createTestQueryClient();
    const key = budgetQueries.range(march, march).queryKey;
    client.setQueryData(key, create(ListBudgetsResponseSchema, {}));
    const { result } = renderHook(() => useMutation(budgetMutations.set), {
      wrapper: createWrapper(client),
    });

    await act(() => result.current.mutateAsync(vars));

    expect(api.setBudget).toHaveBeenCalledExactlyOnceWith(vars);
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it("surfaces RPC errors and still refetches", async () => {
    api.setBudget.mockRejectedValue(new Error("set failed"));
    const client = createTestQueryClient();
    const key = budgetQueries.range(march, march).queryKey;
    client.setQueryData(key, create(ListBudgetsResponseSchema, {}));
    const { result } = renderHook(() => useMutation(budgetMutations.set), {
      wrapper: createWrapper(client),
    });

    await expect(act(() => result.current.mutateAsync(vars))).rejects.toThrow(
      "set failed",
    );
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
