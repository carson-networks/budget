import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryClient } from "../api/connect";
import { connectErrorMessage } from "../api/connectError";
import type { MessageInitShape } from "@bufbuild/protobuf";
import {
  type Category,
  CreateCategoryRequestSchema,
} from "../gen/category/v1/category_pb.js";

export type { Category };
export type CreateCategoryInput = MessageInitShape<typeof CreateCategoryRequestSchema>;

const PAGE_SIZE = 100;

export function useCategories() {
  return useInfiniteQuery({
    queryKey: ["categories"],
    queryFn: async ({ pageParam }) => {
      try {
        return await categoryClient.listCategories({
          cursor: {
            position: pageParam?.position ?? 0,
            limit: pageParam?.limit ?? PAGE_SIZE,
          },
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to load categories"));
      }
    },
    initialPageParam: undefined as { position: number; limit: number } | undefined,
    getNextPageParam: (lastPage) => {
      const cursor = lastPage.nextCursor;
      if (!cursor) return undefined;
      return { position: cursor.position, limit: cursor.limit };
    },
  });
}

export function useAllCategories() {
  const query = useCategories();

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
    // Intentionally omit `query`: we only react to pagination flags, not the whole query object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

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
      try {
        await categoryClient.createCategory(body);
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to create category"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
