import { describe, expect, it } from "vitest";
import { CategoryType, type Category as WireCategory } from "../network/types.js";
import { CategoryKind, mapCategory } from "./category.js";

describe("mapCategory", () => {
  it("maps wire category fields", () => {
    const wire: WireCategory = {
      $typeName: "category.v1.Category",
      $unknown: undefined,
      id: "c1",
      name: "Groceries",
      isParent: false,
      parentCategoryId: "p1",
      isDisabled: false,
      categoryType: CategoryType.EXPENSE,
      createdAt: undefined,
    };

    expect(mapCategory(wire)).toEqual({
      id: "c1",
      name: "Groceries",
      isParent: false,
      parentCategoryId: "p1",
      isDisabled: false,
      categoryKind: CategoryKind.Expense,
      createdAt: undefined,
    });
  });
});
