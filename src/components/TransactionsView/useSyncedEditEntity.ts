import { useEffect } from "react";

/**
 * When `items` refreshes (e.g. query refetch), keep the open edit selection in sync by id.
 */
export function useSyncedEditEntity<T extends { id: string }>(
  items: readonly T[],
  setEditing: React.Dispatch<React.SetStateAction<T | null>>,
) {
  useEffect(() => {
    setEditing((current) => {
      if (!current) return null;
      return items.find((t) => t.id === current.id) ?? null;
    });
  }, [items, setEditing]);
}
