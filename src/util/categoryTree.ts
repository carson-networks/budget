import type { Category } from "../hooks/useCategories";

export type CategoryTableRow = {
  category: Category;
  depth: number;
};

/**
 * Orders categories as a tree: roots first (no parent), then depth-first with children sorted by name.
 */
export function flattenCategoryTree(categories: Category[]): CategoryTableRow[] {
  if (categories.length === 0) return [];

  const childrenByParent = new Map<string, Category[]>();

  for (const c of categories) {
    const pid = c.parentCategoryId;
    if (pid == null || pid === "") {
      continue;
    }
    const list = childrenByParent.get(pid) ?? [];
    list.push(c);
    childrenByParent.set(pid, list);
  }

  for (const [, list] of childrenByParent) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const roots = categories.filter(
    (c) => c.parentCategoryId == null || c.parentCategoryId === ""
  );
  roots.sort((a, b) => a.name.localeCompare(b.name));

  const out: CategoryTableRow[] = [];

  function walk(cat: Category, depth: number) {
    out.push({ category: cat, depth });
    const kids = childrenByParent.get(cat.id);
    if (kids) {
      for (const k of kids) {
        walk(k, depth + 1);
      }
    }
  }

  for (const r of roots) {
    walk(r, 0);
  }

  // Orphans: parent id not in set (data inconsistency) — list after tree so nothing is lost
  const seen = new Set(out.map((r) => r.category.id));
  const orphans = categories.filter((c) => !seen.has(c.id));
  orphans.sort((a, b) => a.name.localeCompare(b.name));
  for (const o of orphans) {
    out.push({ category: o, depth: 0 });
  }

  return out;
}

export function categoryNameById(categories: Category[]): Map<string, string> {
  return new Map(categories.map((c) => [c.id, c.name]));
}

/** "Parent / Child" when the category has a parent; otherwise the category name. */
export function formatCategoryDisplayName(
  c: Category,
  nameById: Map<string, string>
): string {
  const pid = c.parentCategoryId;
  if (pid == null || pid === "") return c.name;
  const p = nameById.get(pid);
  return p ? `${p} / ${c.name}` : c.name;
}

/** Resolve a category id to a display name; falls back to the raw id if unknown. */
export function displayNameForCategoryId(
  categoryId: string,
  categories: Category[]
): string {
  const c = categories.find((x) => x.id === categoryId);
  if (!c) return categoryId;
  return formatCategoryDisplayName(c, categoryNameById(categories));
}
