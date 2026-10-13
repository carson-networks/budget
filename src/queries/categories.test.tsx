import { create } from "@bufbuild/protobuf";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CategorySchema,
  CategoryType,
  ListCategoriesResponseSchema,
} from "../connectRPC/types.js";
import { CategoryKind } from "../models";
import {
  createTestQueryClient,
  createWrapper,
} from "../test/renderWithProviders.js";
import { categoryMutations, categoryQueries } from "./categories.js";

const api = vi.hoisted(() => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));
vi.mock("../connectRPC/connect.js", () => ({ categoryClient: api }));

describe("categoryQueries.list", () => {
  beforeEach(() => vi.resetAllMocks());

  it("maps wire categories to the domain model", async () => {
    api.listCategories.mockResolvedValue(
      create(ListCategoriesResponseSchema, {
        categories: [
          create(CategorySchema, {
            id: "food",
            name: "Food",
            isParent: true,
            isDisabled: false,
            categoryType: CategoryType.EXPENSE,
          }),
        ],
      }),
    );
    const { result } = renderHook(
      () => useInfiniteQuery(categoryQueries.list()),
      { wrapper: createWrapper(createTestQueryClient()) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.listCategories).toHaveBeenCalledWith({
      cursor: { position: 0, limit: 50 },
    });
    expect(result.current.data).toEqual([
      expect.objectContaining({
        id: "food",
        name: "Food",
        isParent: true,
        categoryKind: CategoryKind.Expense,
      }),
    ]);
  });
});

describe("categoryMutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.createCategory.mockResolvedValue({});
    api.updateCategory.mockResolvedValue({});
  });

  function setup<T>(useHook: () => T) {
    const client = createTestQueryClient();
    client.setQueryData(categoryQueries.list().queryKey, {
      pages: [create(ListCategoriesResponseSchema, {})],
      pageParams: [undefined],
    });
    const { result } = renderHook(useHook, { wrapper: createWrapper(client) });
    const invalidated = () =>
      client.getQueryState(categoryQueries.list().queryKey)?.isInvalidated;
    return { result, invalidated };
  }

  it("create sends the fields and refetches categories", async () => {
    const { result, invalidated } = setup(() =>
      useMutation(categoryMutations.create),
    );
    await act(() =>
      result.current.mutateAsync({
        name: "Rent",
        isParent: false,
        parentCategoryId: "housing",
        isDisabled: false,
        categoryType: CategoryType.EXPENSE,
      }),
    );
    expect(api.createCategory).toHaveBeenCalledExactlyOnceWith({
      name: "Rent",
      isParent: false,
      parentCategoryId: "housing",
      isDisabled: false,
      categoryType: CategoryType.EXPENSE,
    });
    expect(invalidated()).toBe(true);
  });

  it("update sends the fields and refetches categories", async () => {
    const { result, invalidated } = setup(() =>
      useMutation(categoryMutations.update),
    );
    await act(() =>
      result.current.mutateAsync({
        id: "food",
        name: "Groceries",
        isDisabled: true,
        parentCategoryId: undefined,
      }),
    );
    expect(api.updateCategory).toHaveBeenCalledExactlyOnceWith({
      id: "food",
      name: "Groceries",
      parentCategoryId: undefined,
      isDisabled: true,
    });
    expect(invalidated()).toBe(true);
  });

  it("surfaces RPC errors and still refetches", async () => {
    api.updateCategory.mockRejectedValue(new Error("update failed"));
    const { result, invalidated } = setup(() =>
      useMutation(categoryMutations.update),
    );
    await expect(
      act(() =>
        result.current.mutateAsync({
          id: "food",
          name: "Food",
          isDisabled: false,
        }),
      ),
    ).rejects.toThrow("update failed");
    expect(invalidated()).toBe(true);
  });
});
