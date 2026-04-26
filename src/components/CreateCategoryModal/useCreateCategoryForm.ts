import { useMemo, useState, useEffect, useCallback } from "react";
import {
  useAllCategories,
  useCreateCategory,
  CategoryType,
  type CreateCategoryInput,
} from "../../hooks/useCategories";

export function useCreateCategoryForm(open: boolean, onClose: () => void) {
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState<string | null>(
    String(CategoryType.EXPENSE),
  );
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const { categories } = useAllCategories();
  const createCategory = useCreateCategory();

  useEffect(() => {
    if (!open) createCategory.reset();
  }, [open, createCategory]);

  const parentOptions = useMemo(
    () =>
      [...categories]
        .filter((c) => !c.parentCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const resetForm = useCallback(() => {
    setName("");
    setCategoryType(String(CategoryType.EXPENSE));
    setParentCategoryId(null);
    setIsGroup(false);
    setIsDisabled(false);
    createCategory.reset();
  }, [createCategory]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (categoryType === null) return;

      const hasParent = parentCategoryId !== null && parentCategoryId !== "";
      const body: CreateCategoryInput = {
        name,
        isParent: !hasParent && isGroup,
        parentCategoryId: hasParent ? parentCategoryId! : undefined,
        isDisabled,
        categoryType: Number(categoryType) as CategoryType,
      };

      createCategory.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [
      categoryType,
      createCategory,
      handleClose,
      isDisabled,
      isGroup,
      name,
      parentCategoryId,
    ],
  );

  const isFormValid = name.trim().length > 0 && categoryType !== null;

  return {
    name,
    setName,
    categoryType,
    setCategoryType,
    parentCategoryId,
    setParentCategoryId,
    isGroup,
    setIsGroup,
    isDisabled,
    setIsDisabled,
    parentOptions,
    createCategory,
    handleSubmit,
    handleClose,
    isFormValid,
  };
}
