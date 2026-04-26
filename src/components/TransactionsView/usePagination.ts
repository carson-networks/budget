import { useMemo, useState } from "react";

export function usePagination<T>(items: readonly T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  return { page, setPage, paginatedItems, totalPages };
}
