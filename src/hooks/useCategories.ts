import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { categoryClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import {
  CategoryType,
  type ListCategoriesCursor,
  type ListCategoriesResponse,
} from "../connectRPC/types.js";
import { mapCategory, type Category } from "../models";

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
  parentCategoryId?: string;
  isDisabled: boolean;
};

const PAGE_SIZE = 50;

export function useAllCategories() {
  const query = useInfiniteQuery<
    ListCategoriesResponse,
    Error,
    InfiniteData<ListCategoriesResponse>,
    string[],
    ListCategoriesCursor | undefined
  >({
    queryKey: ["categories"],
    queryFn: async ({ pageParam }) => {
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

  const categories: Category[] =
    query.data?.pages
      .flatMap((page) => (page.categories ?? []).filter(Boolean))
      .map(mapCategory) ?? [];

  return {
    ...query,
    categories,
  };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateCategoryInput) => {
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateCategoryInput) => {
      try {
        await categoryClient.updateCategory({
          id: body.id,
          name: body.name,
          parentCategoryId: body.parentCategoryId,
          isDisabled: body.isDisabled,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
