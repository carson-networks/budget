import { CategoryType } from "../../connectRPC/types.js";
import type { Category } from "../../models";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../../queries/categories.js";

/** Field values shared by the create and edit category forms. */
export type CategoryFormValues = {
  name: string;
  /** Select value: a stringified `CategoryType`, or null when cleared. Create only. */
  categoryType: string | null;
  isDisabled: boolean;
  /** Selected parent id; null/"" means top level. */
  parentCategoryId: string | null;
};

export function emptyCategoryForm(): CategoryFormValues {
  return {
    name: "",
    categoryType: String(CategoryType.EXPENSE),
    isDisabled: false,
    parentCategoryId: null,
  };
}

export function categoryFormFrom(category: Category): CategoryFormValues {
  return {
    ...emptyCategoryForm(),
    name: category.name,
    isDisabled: category.isDisabled,
    parentCategoryId: category.parentCategoryId ?? null,
  };
}

function selectedParentId(values: CategoryFormValues): string | undefined {
  return values.parentCategoryId ? values.parentCategoryId : undefined;
}

export function isCreateCategoryFormValid(values: CategoryFormValues) {
  return values.name.trim().length > 0 && values.categoryType !== null;
}

export function isEditCategoryFormValid(values: CategoryFormValues) {
  return values.name.trim().length > 0;
}

/** No parent selected → a top-level parent category; otherwise a child leaf. */
export function toCreateCategoryInput(
  values: CategoryFormValues,
): CreateCategoryInput {
  const parentCategoryId = selectedParentId(values);
  return {
    name: values.name.trim(),
    isParent: parentCategoryId === undefined,
    parentCategoryId,
    isDisabled: false,
    categoryType: Number(values.categoryType) as CategoryType,
  };
}

/** Empty parent → top-level (omit id); selection → nest under that parent. */
export function toUpdateCategoryInput(
  id: string,
  values: CategoryFormValues,
): UpdateCategoryInput {
  return {
    id,
    name: values.name.trim(),
    isDisabled: values.isDisabled,
    parentCategoryId: selectedParentId(values),
  };
}

/** Top-level categories (optionally minus `excludeId`) as sorted select options. */
export function parentCategoryOptions(
  categories: readonly Category[],
  excludeId?: string,
) {
  return categories
    .filter((c) => !c.parentCategoryId && c.id !== excludeId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ value: c.id, label: c.name }));
}
