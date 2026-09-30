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
import { useUpdateCategory } from "./useCategories.js";

const { updateCategoryMock } = vi.hoisted(() => ({
  updateCategoryMock: vi.fn(),
}));

vi.mock("../connectRPC/connect.js", () => ({
  categoryClient: {
    createCategory: vi.fn(),
    listCategories: vi.fn(),
    updateCategory: updateCategoryMock,
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useUpdateCategory", () => {
  beforeEach(() => {
    updateCategoryMock.mockReset();
    updateCategoryMock.mockResolvedValue({});
  });

  it("calls updateCategory and invalidates the categories query", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.setQueryData<InfiniteData<ListCategoriesResponse>>(
      ["categories"],
      {
        pages: [
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
            nextCursor: undefined,
          }),
        ],
        pageParams: [undefined],
      },
    );

    const { result } = renderHook(() => useUpdateCategory(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "food",
        name: "Groceries",
        isDisabled: true,
        parentCategoryId: undefined,
      });
    });

    expect(updateCategoryMock).toHaveBeenCalledWith({
      id: "food",
      name: "Groceries",
      parentCategoryId: undefined,
      isDisabled: true,
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["categories"],
      });
    });
  });

  it("surfaces connect errors from updateCategory", async () => {
    updateCategoryMock.mockRejectedValue(new Error("update failed"));
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

    const { result } = renderHook(() => useUpdateCategory(), {
      wrapper: wrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        id: "food",
        name: "Food",
        isDisabled: false,
      }),
    ).rejects.toThrow("update failed");
  });
});
