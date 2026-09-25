import { describe, expect, it } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "./categorySegments.js";

function makeCategory(
  partial: Partial<Category> & Pick<Category, "id" | "name">,
): Category {
  return {
    isParent: false,
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
    ...partial,
  };
}

describe("buildCategorySegments", () => {
  it("groups children under roots and sorts siblings by name", () => {
    const categories = [
      makeCategory({ id: "p1", name: "Food", isParent: true }),
      makeCategory({
        id: "c2",
        name: "Restaurants",
        parentCategoryId: "p1",
      }),
      makeCategory({
        id: "c1",
        name: "Groceries",
        parentCategoryId: "p1",
      }),
      makeCategory({ id: "p2", name: "Income", isParent: true }),
    ];

    const segments = buildCategorySegments(categories);
    expect(segments.map((s) => s.root.name)).toEqual(["Food", "Income"]);
    expect(segments[0].descendantRows.map((r) => r.category.name)).toEqual([
      "Groceries",
      "Restaurants",
    ]);
    expect(segments[0].descendantRows.every((r) => r.depth === 0)).toBe(true);
    expect(segments[1].descendantRows).toEqual([]);
  });

  it("treats categories with missing parents as roots", () => {
    const segments = buildCategorySegments([
      makeCategory({
        id: "orphan",
        name: "Orphan",
        parentCategoryId: "missing",
      }),
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].root.id).toBe("orphan");
    expect(segments[0].descendantRows).toEqual([]);
  });
});

describe("sortCategorySegmentsForDisplay", () => {
  it("orders enabled parents before disabled and sorts rows the same way", () => {
    const segments = buildCategorySegments([
      makeCategory({
        id: "disabled-parent",
        name: "Zzz",
        isParent: true,
        isDisabled: true,
      }),
      makeCategory({
        id: "enabled-parent",
        name: "Aaa",
        isParent: true,
      }),
      makeCategory({
        id: "disabled-child",
        name: "Banana",
        parentCategoryId: "enabled-parent",
        isDisabled: true,
      }),
      makeCategory({
        id: "enabled-child",
        name: "Apple",
        parentCategoryId: "enabled-parent",
      }),
    ]);

    const sorted = sortCategorySegmentsForDisplay(segments);
    expect(sorted.map((s) => s.root.name)).toEqual(["Aaa", "Zzz"]);
    expect(sorted[0].descendantRows.map((r) => r.category.name)).toEqual([
      "Apple",
      "Banana",
    ]);
  });
});
