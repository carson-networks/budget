import { useCallback, useState } from "react";

export function useEntityModals<T>() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  return {
    createOpen,
    setCreateOpen,
    openCreate,
    closeCreate,
    editing,
    setEditing,
  };
}
