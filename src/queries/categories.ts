import {
  infiniteQueryOptions,
  mutationOptions,
} from "@tanstack/react-query";
import { categoryClient } from "../connectRPC/connect.js";
import type {
  CategoryType,
  ListCategoriesCursor,
} from "../connectRPC/types.js";
import { mapCategory } from "../models";
import { invalidatesOnSettled } from "./invalidate.js";
import { rpc } from "./rpc.js";

const PAGE_SIZE = 50;

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

export const categoryQueries = {
  all: () => ["categories"] as const,

  /** Every category, mapped to the domain model (`data` is `Category[]`). */
  list: () =>
    infiniteQueryOptions({
      queryKey: [...categoryQueries.all(), "list"] as const,
      queryFn: ({ pageParam }) =>
        rpc(
          categoryClient.listCategories({
            cursor: pageParam ?? { position: 0, limit: PAGE_SIZE },
          }),
        ),
      initialPageParam: undefined as ListCategoriesCursor | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      select: (data) =>
        data.pages
          .flatMap((page) => page.categories ?? [])
          .filter(Boolean)
          .map(mapCategory),
    }),
};

export const categoryMutations = {
  create: mutationOptions({
    mutationKey: ["categories", "create"],
    mutationFn: (body: CreateCategoryInput) =>
      rpc(
        categoryClient.createCategory({
          name: body.name,
          isParent: body.isParent,
          parentCategoryId: body.parentCategoryId,
          isDisabled: body.isDisabled,
          categoryType: body.categoryType,
        }),
      ),
    ...invalidatesOnSettled(categoryQueries.all()),
  }),

  update: mutationOptions({
    mutationKey: ["categories", "update"],
    mutationFn: (body: UpdateCategoryInput) =>
      rpc(
        categoryClient.updateCategory({
          id: body.id,
          name: body.name,
          parentCategoryId: body.parentCategoryId,
          isDisabled: body.isDisabled,
        }),
      ),
    ...invalidatesOnSettled(categoryQueries.all()),
  }),
};
