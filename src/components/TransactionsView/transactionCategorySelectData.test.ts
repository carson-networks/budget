import { describe, expect, it } from "vitest";
import { CategoryKind, type Category } from "../../models";
import {
  buildTransactionCategorySelectData,
  isSelectableTransactionCategory,
} from "./transactionCategorySelectData.js";

function category(id: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    name: id,
    isParent: false,
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
    ...overrides,
  };
}

describe("transaction category choices", () => {
  it("sorts parent groups and children, retaining disabled leaves as disabled options", () => {
    const categories = [
      category("z-parent", { isParent: true }),
      category("b-child", { parentCategoryId: "a-parent", isDisabled: true }),
      category("a-parent", { isParent: true }),
      category("a-child", { parentCategoryId: "a-parent" }),
      category("z-child", { parentCategoryId: "z-parent" }),
      category("empty-parent", { isParent: true }),
    ];
    const original = [...categories];
    expect(buildTransactionCategorySelectData(categories)).toEqual([
      {
        group: "a-parent",
        items: [
          { value: "a-child", label: "a-child", disabled: false },
          { value: "b-child", label: "b-child", disabled: true },
        ],
      },
      {
        group: "z-parent",
        items: [{ value: "z-child", label: "z-child", disabled: false }],
      },
    ]);
    expect(categories).toEqual(original);
  });

  it("puts unparented, missing-parent, and non-parent-linked leaves under Other", () => {
    expect(
      buildTransactionCategorySelectData([
        category("c", { parentCategoryId: "a" }),
        category("b", { parentCategoryId: "missing" }),
        category("a"),
      ]),
    ).toEqual([
      {
        group: "Other",
        items: ["a", "b", "c"].map((id) => ({
          value: id,
          label: id,
          disabled: false,
        })),
      },
    ]);
    expect(buildTransactionCategorySelectData([])).toEqual([]);
  });

  it("matches the spike by allowing active leaves, including children of disabled parents", () => {
    const categories = [
      category("parent", { isParent: true, isDisabled: true }),
      category("active", { parentCategoryId: "parent" }),
      category("disabled", { isDisabled: true }),
    ];
    expect(isSelectableTransactionCategory(categories, "active")).toBe(true);
    for (const id of ["parent", "disabled", "missing", "", undefined]) {
      expect(isSelectableTransactionCategory(categories, id)).toBe(false);
    }
  });
});
