import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { CategoryType } from "../../../connectRPC/types.js";
import {
  useAllCategories,
  useCreateCategory,
  type CreateCategoryInput,
} from "../../../hooks/useCategories.js";

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
    if (!open) {
      createCategory.reset();
    }
  }, [open, createCategory]);

  const parentOptions = useMemo(
    () =>
      [...categories]
        .filter((c) => !c.parentCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const hasParent =
    parentCategoryId !== null && parentCategoryId !== "";

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
    (e: FormEvent) => {
      e.preventDefault();
      if (categoryType === null) return;
      if (!name.trim()) return;
      // Server rejects standalone leaves: must be a group or have a parent.
      if (!hasParent && !isGroup) return;

      const body: CreateCategoryInput = {
        name: name.trim(),
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
      hasParent,
      isDisabled,
      isGroup,
      name,
      parentCategoryId,
    ],
  );

  const isFormValid =
    name.trim().length > 0 &&
    categoryType !== null &&
    (hasParent || isGroup);

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
