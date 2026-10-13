import type { Category } from "../../../models";

/** One top-level parent and its direct children. */
export type CategorySegment = {
  root: Category;
  children: Category[];
};

/**
 * Groups each top-level category with its direct children (sorted by name).
 * Top-level = no `parentCategoryId`, or parent missing from the set.
 */
export function buildCategorySegments(
  categories: Category[],
): CategorySegment[] {
  const idSet = new Set(categories.map((c) => c.id));
  const roots = categories
    .filter(
      (c) =>
        c.parentCategoryId === undefined || !idSet.has(c.parentCategoryId),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const rootIds = new Set(roots.map((r) => r.id));

  const childrenByRoot = new Map<string, Category[]>();
  for (const c of categories) {
    const parentId = c.parentCategoryId;
    if (parentId === undefined || !rootIds.has(parentId)) continue;
    const bucket = childrenByRoot.get(parentId);
    if (bucket) bucket.push(c);
    else childrenByRoot.set(parentId, [c]);
  }

  for (const list of childrenByRoot.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return roots.map((root) => ({
    root,
    children: childrenByRoot.get(root.id) ?? [],
  }));
}

function sortByEnabledThenName(categories: Category[]): Category[] {
  const enabled = categories.filter((c) => !c.isDisabled);
  const disabled = categories.filter((c) => c.isDisabled);
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  enabled.sort(byName);
  disabled.sort(byName);
  return [...enabled, ...disabled];
}

/** Enabled parents first; disabled parents last. Within each table, enabled then disabled. */
export function sortCategorySegmentsForDisplay(
  segments: CategorySegment[],
): CategorySegment[] {
  const enabledParents = segments.filter((s) => !s.root.isDisabled);
  const disabledParents = segments.filter((s) => s.root.isDisabled);
  const byRootName = (a: CategorySegment, b: CategorySegment) =>
    a.root.name.localeCompare(b.root.name);
  enabledParents.sort(byRootName);
  disabledParents.sort(byRootName);
  return [...enabledParents, ...disabledParents].map((seg) => ({
    root: seg.root,
    children: sortByEnabledThenName(seg.children),
  }));
}
