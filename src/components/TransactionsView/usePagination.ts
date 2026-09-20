import { useMemo, useState } from "react";

/**
 * Client-side pagination for an in-memory list. Clamps `page` when the item
 * count shrinks (e.g. filtered account/search views).
 */
export function usePagination<T>(items: readonly T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    setPage,
    paginatedItems,
    totalPages,
  };
}
