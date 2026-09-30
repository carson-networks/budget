import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CategorySchema,
  CategoryType,
  ListCategoriesResponseSchema,
  type ListCategoriesResponse,
} from "../connectRPC/types.js";
import { useCreateCategory } from "./useCategories.js";

const { createCategoryMock } = vi.hoisted(() => ({
  createCategoryMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  categoryClient: {
    createCategory: createCategoryMock,
    listCategories: vi.fn(),
    updateCategory: vi.fn(),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useCreateCategory", () => {
  beforeEach(() => {
    createCategoryMock.mockReset();
    createCategoryMock.mockResolvedValue({ status: 0 });
  });

  it("calls createCategory and invalidates the categories query", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.setQueryData<InfiniteData<ListCategoriesResponse>>(
      ["categories"],
      {
        pages: [
          create(ListCategoriesResponseSchema, {
            categories: [
              create(CategorySchema, {
                id: "existing",
                name: "Food",
                isParent: true,
                isDisabled: false,
                categoryType: CategoryType.EXPENSE,
              }),
            ],
            nextCursor: undefined,
          }),
        ],
        pageParams: [undefined],
      },
    );

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: "Groceries",
        isParent: false,
        parentCategoryId: "existing",
        isDisabled: false,
        categoryType: CategoryType.EXPENSE,
      });
    });

    expect(createCategoryMock).toHaveBeenCalledWith({
      name: "Groceries",
      isParent: false,
      parentCategoryId: "existing",
      isDisabled: false,
      categoryType: CategoryType.EXPENSE,
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["categories"],
      });
    });
  });

  it("surfaces connect errors from createCategory", async () => {
    createCategoryMock.mockRejectedValue(new Error("create failed"));
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: wrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        name: "Bad",
        isParent: true,
        isDisabled: false,
        categoryType: CategoryType.INCOME,
      }),
    ).rejects.toThrow("create failed");
  });
});
