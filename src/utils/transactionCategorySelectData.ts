import type { ComboboxData, ComboboxItemGroup } from "@mantine/core";
import type { Category } from "../gen/category/v1/category_pb.js";

/** True if this category may be assigned to a transaction (leaf and not disabled). */
export function isSelectableTransactionCategory(
  categories: Category[],
  categoryId: string | undefined,
): boolean {
  if (!categoryId) return false;
  const c = categories.find((x) => x.id === categoryId);
  return !!c && !c.isParent && !c.isDisabled;
}

export function countSelectableTransactionCategories(categories: Category[]): number {
  return categories.filter((c) => !c.isParent && !c.isDisabled).length;
}

/**
 * Grouped select data: each parent is a non-selectable section header; children are options.
 * Disabled leaves appear but cannot be chosen. Orphan leaves go under "Other".
 */
export function buildTransactionCategorySelectData(categories: Category[]): ComboboxData {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parents = categories
    .filter((c) => c.isParent)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const assignedChildIds = new Set<string>();
  const groups: ComboboxItemGroup[] = [];

  for (const parent of parents) {
    const items = categories
      .filter((c) => !c.isParent && c.parentCategoryId === parent.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        value: c.id,
        label: c.name,
        disabled: c.isDisabled,
      }));

    if (items.length === 0) continue;

    for (const item of items) {
      assignedChildIds.add(item.value);
    }
    groups.push({ group: parent.name, items });
  }

  const orphans = categories
    .filter((c) => {
      if (c.isParent || assignedChildIds.has(c.id)) return false;
      const p = c.parentCategoryId ? byId.get(c.parentCategoryId) : undefined;
      if (!c.parentCategoryId) return true;
      if (!p) return true;
      return !p.isParent;
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      value: c.id,
      label: c.name,
      disabled: c.isDisabled,
    }));

  if (orphans.length > 0) {
    groups.push({ group: "Other", items: orphans });
  }

  return groups as ComboboxData;
}
