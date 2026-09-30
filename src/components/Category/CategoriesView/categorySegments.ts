import type { Category } from "../../../models";

/**
 * One top-level parent and its direct children.
 * Domain rule: parents are one level deep — no sub-parents / deeper nesting.
 */
export type CategorySegment = {
  root: Category;
  children: Category[];
};

/**
 * Groups categories under each root (no `parentCategoryId`, or parent missing from set).
 * Children of each root are sorted by name. Nested children-of-children are ignored
 * (they are not a supported product shape).
 */
export function buildCategorySegments(
  categories: Category[],
): CategorySegment[] {
  const idSet = new Set(categories.map((c) => c.id));
  const childrenByParent = new Map<string, Category[]>();
  const roots: Category[] = [];

  for (const c of categories) {
    const parentId = c.parentCategoryId;
    if (parentId === undefined || !idSet.has(parentId)) {
      roots.push(c);
      continue;
    }
    const bucket = childrenByParent.get(parentId);
    if (bucket) bucket.push(c);
    else childrenByParent.set(parentId, [c]);
  }

  roots.sort((a, b) => a.name.localeCompare(b.name));

  return roots.map((root) => {
    const children = [...(childrenByParent.get(root.id) ?? [])];
    children.sort((a, b) => a.name.localeCompare(b.name));
    return { root, children };
  });
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
