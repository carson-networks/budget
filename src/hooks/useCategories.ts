import { create } from "@bufbuild/protobuf";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { categoryClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import {
  FAKE_CATEGORIES,
  isFakeBudgetData,
  makeFakeCategory,
} from "../data/fakeData";
import type {
  Category,
  ListCategoriesCursor,
  ListCategoriesResponse,
} from "../gen/category/v1/category_pb.js";
import {
  CategorySchema,
  CategoryType,
  ListCategoriesResponseSchema,
} from "../gen/category/v1/category_pb.js";

export type { Category };
export { CategoryType };

export type CreateCategoryInput = {
  name: string;
  isParent: boolean;
  parentCategoryId?: string;
  isDisabled: boolean;
  categoryType: CategoryType;
};

export type UpdateCategoryInput = {
  id: string;
  name: string;
  isDisabled: boolean;
  /** Only applied when using fake data; real RPC does not support type updates yet. */
  categoryType: CategoryType;
};

const PAGE_SIZE = 50;

export function useCategories() {
  return useInfiniteQuery<
    ListCategoriesResponse,
    Error,
    InfiniteData<ListCategoriesResponse>,
    string[],
    ListCategoriesCursor | undefined
  >({
    queryKey: ["categories"],
    queryFn: async ({ pageParam }) => {
      if (isFakeBudgetData()) {
        if (pageParam !== undefined) {
          return create(ListCategoriesResponseSchema, { categories: [] });
        }
        return create(ListCategoriesResponseSchema, {
          categories: [...FAKE_CATEGORIES],
          nextCursor: undefined,
        });
      }
      try {
        return await categoryClient.listCategories({
          cursor:
            pageParam === undefined
              ? { position: 0, limit: PAGE_SIZE }
              : pageParam,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useAllCategories() {
  const query = useCategories();

  const categories = (
    query.data?.pages.flatMap((page) => page.categories ?? []) ?? []
  ).filter((c): c is Category => c != null);

  return {
    ...query,
    categories,
  };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateCategoryInput) => {
      if (isFakeBudgetData()) {
        return;
      }
      try {
        await categoryClient.createCategory({
          name: body.name,
          isParent: body.isParent,
          parentCategoryId: body.parentCategoryId,
          isDisabled: body.isDisabled,
          categoryType: body.categoryType,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSuccess: (_data, variables) => {
      if (isFakeBudgetData()) {
        const category = makeFakeCategory(variables);
        queryClient.setQueryData(
          ["categories"],
          (old: InfiniteData<ListCategoriesResponse> | undefined) => {
            if (!old?.pages.length) {
              return {
                pages: [
                  create(ListCategoriesResponseSchema, {
                    categories: [category],
                    nextCursor: undefined,
                  }),
                ],
                pageParams: [undefined],
              };
            }
            const [first, ...rest] = old.pages;
            return {
              ...old,
              pages: [
                create(ListCategoriesResponseSchema, {
                  categories: [category, ...(first.categories ?? [])],
                  nextCursor: first.nextCursor,
                }),
                ...rest,
              ],
            };
          },
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateCategoryInput) => {
      if (isFakeBudgetData()) {
        return;
      }
      try {
        await categoryClient.updateCategory({
          id: body.id,
          name: body.name,
          isDisabled: body.isDisabled,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSuccess: (_data, body) => {
      if (isFakeBudgetData()) {
        queryClient.setQueryData(
          ["categories"],
          (old: InfiniteData<ListCategoriesResponse> | undefined) => {
            if (!old?.pages.length) return old;
            return {
              ...old,
              pages: old.pages.map((page) =>
                create(ListCategoriesResponseSchema, {
                  categories: page.categories.map((c) => {
                    if (c.id !== body.id) return c;
                    return create(CategorySchema, {
                      id: c.id,
                      name: body.name,
                      isParent: c.isParent,
                      parentCategoryId: c.parentCategoryId,
                      isDisabled: body.isDisabled,
                      categoryType: body.categoryType,
                      createdAt: c.createdAt,
                    });
                  }),
                  nextCursor: page.nextCursor,
                }),
              ),
            };
          },
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      void id;
      if (!isFakeBudgetData()) {
        throw new Error("Deleting categories is not supported by the server yet.");
      }
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData(
        ["categories"],
        (old: InfiniteData<ListCategoriesResponse> | undefined) => {
          if (!old?.pages.length) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              create(ListCategoriesResponseSchema, {
                categories: page.categories.filter(
                  (c) => c.id !== id && c.parentCategoryId !== id,
                ),
                nextCursor: page.nextCursor,
              }),
            ),
          };
        },
      );
    },
  });
}
