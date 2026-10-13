import type { ComboboxItemGroup } from "@mantine/core";
import type { Category } from "../../models";

export function isSelectableTransactionCategory(
  categories: readonly Category[],
  categoryId: string | undefined,
): boolean {
  return categories.some(
    (category) =>
      category.id === categoryId && !category.isParent && !category.isDisabled,
  );
}

export function buildTransactionCategorySelectData(
  categories: readonly Category[],
): ComboboxItemGroup[] {
  const parents = categories
    .filter((category) => category.isParent)
    .sort((a, b) => a.name.localeCompare(b.name));
  const leaves = categories
    .filter((category) => !category.isParent)
    .sort((a, b) => a.name.localeCompare(b.name));
  const parentIds = new Set(parents.map((parent) => parent.id));
  const option = (category: Category) => ({
    value: category.id,
    label: category.name,
    disabled: category.isDisabled,
  });
  const groups = parents
    .map((parent) => ({
      group: parent.name,
      items: leaves
        .filter((category) => category.parentCategoryId === parent.id)
        .map(option),
    }))
    .filter((group) => group.items.length > 0);
  const orphans = leaves.filter(
    (category) => !parentIds.has(category.parentCategoryId ?? ""),
  );
  if (orphans.length > 0) {
    groups.push({ group: "Other", items: orphans.map(option) });
  }
  return groups;
}
