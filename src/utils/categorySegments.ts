import type { Category } from "../gen/category/v1/category_pb.js";

export type CategoryRow = { category: Category; depth: number };

/**
 * One top-level parent and its descendant rows (root is not repeated in the table).
 * The product model allows only one level: parent → child.
 */
export type CategorySegment = {
  root: Category;
  descendantRows: CategoryRow[];
};

/**
 * Groups categories under each root (no `parentCategoryId`, or parent missing from set).
 * Each segment is ordered depth-first; siblings sorted by name.
 */
export function buildCategorySegments(categories: Category[]): CategorySegment[] {
  const idSet = new Set(categories.map((c) => c.id));
  const byParent = new Map<string | undefined, Category[]>();

  for (const c of categories) {
    let parentId = c.parentCategoryId ?? undefined;
    if (parentId !== undefined && !idSet.has(parentId)) {
      parentId = undefined;
    }
    const bucket = byParent.get(parentId);
    if (bucket) bucket.push(c);
    else byParent.set(parentId, [c]);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const roots = [...(byParent.get(undefined) ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const walk = (parentId: string, depth: number): CategoryRow[] => {
    const kids = byParent.get(parentId) ?? [];
    const out: CategoryRow[] = [];
    for (const k of kids) {
      out.push({ category: k, depth });
      out.push(...walk(k.id, depth + 1));
    }
    return out;
  };

  return roots.map((root) => ({
    root,
    descendantRows: walk(root.id, 0),
  }));
}

function sortRowsByEnabledThenName(rows: CategoryRow[]): CategoryRow[] {
  const enabled = rows.filter((r) => !r.category.isDisabled);
  const disabled = rows.filter((r) => r.category.isDisabled);
  const byName = (a: CategoryRow, b: CategoryRow) =>
    a.category.name.localeCompare(b.category.name);
  enabled.sort(byName);
  disabled.sort(byName);
  return [...enabled, ...disabled];
}

/** Enabled parents first; disabled parents last. Within each table, enabled rows then disabled. */
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
    descendantRows: sortRowsByEnabledThenName(seg.descendantRows),
  }));
}
