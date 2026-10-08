import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { Category } from "../../../models";
import {
  useAllCategories,
  useUpdateCategory,
  type UpdateCategoryInput,
} from "../../../hooks/useCategories.js";

/** Form state for one category. Remount with `key={category.id}`. */
export function useEditCategoryForm(category: Category, onClose: () => void) {
  const [name, setName] = useState(category.name);
  const [isDisabled, setIsDisabled] = useState(category.isDisabled);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(
    category.parentCategoryId ?? null,
  );

  const { categories } = useAllCategories();
  const updateCategory = useUpdateCategory();

  const parentOptions = useMemo(
    () =>
      [...categories]
        .filter((c) => !c.parentCategoryId && c.id !== category.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories, category.id],
  );

  const hasParent =
    parentCategoryId !== null && parentCategoryId !== "";

  const handleClose = useCallback(() => {
    updateCategory.reset();
    onClose();
  }, [onClose, updateCategory]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      // Empty parent → top-level (omit id); selection → nest under that parent.
      const body: UpdateCategoryInput = {
        id: category.id,
        name: name.trim(),
        isDisabled,
        parentCategoryId: hasParent ? parentCategoryId! : undefined,
      };

      updateCategory.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [
      category.id,
      handleClose,
      hasParent,
      isDisabled,
      name,
      parentCategoryId,
      updateCategory,
    ],
  );

  const isFormValid = name.trim().length > 0;
  const busy = updateCategory.isPending;

  return {
    name,
    setName,
    isDisabled,
    setIsDisabled,
    parentCategoryId,
    setParentCategoryId,
    parentOptions,
    updateCategory,
    handleSubmit,
    handleClose,
    isFormValid,
    busy,
  };
}
