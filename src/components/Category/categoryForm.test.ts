import { describe, expect, it } from "vitest";
import { CategoryType } from "../../connectRPC/types.js";
import { CategoryKind, type Category } from "../../models";
import {
  categoryFormFrom,
  emptyCategoryForm,
  isCreateCategoryFormValid,
  isEditCategoryFormValid,
  parentCategoryOptions,
  toCreateCategoryInput,
  toUpdateCategoryInput,
} from "./categoryForm.js";

const category = (overrides: Partial<Category> & { id: string }): Category => ({
  name: overrides.id,
  isParent: true,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
  ...overrides,
});

describe("categoryForm", () => {
  it("starts empty with the Expense type selected", () => {
    expect(emptyCategoryForm()).toMatchObject({
      name: "",
      categoryType: String(CategoryType.EXPENSE),
      parentCategoryId: null,
    });
  });

  it("is valid once a non-blank name (and, on create, a type) is set", () => {
    expect(isCreateCategoryFormValid(emptyCategoryForm())).toBe(false);
    expect(
      isCreateCategoryFormValid({ ...emptyCategoryForm(), name: "  Bills " }),
    ).toBe(true);
    expect(
      isCreateCategoryFormValid({
        ...emptyCategoryForm(),
        name: "Bills",
        categoryType: null,
      }),
    ).toBe(false);
    expect(
      isEditCategoryFormValid({
        ...emptyCategoryForm(),
        name: "Bills",
        categoryType: null,
      }),
    ).toBe(true);
  });

  it("creates a top-level parent when no parent is selected", () => {
    expect(
      toCreateCategoryInput({
        ...emptyCategoryForm(),
        name: "  Housing  ",
        categoryType: String(CategoryType.INCOME),
      }),
    ).toEqual({
      name: "Housing",
      isParent: true,
      parentCategoryId: undefined,
      isDisabled: false,
      categoryType: CategoryType.INCOME,
    });
  });

  it("creates a leaf under a selected parent", () => {
    expect(
      toCreateCategoryInput({
        ...emptyCategoryForm(),
        name: "Rent",
        parentCategoryId: "food",
      }),
    ).toEqual({
      name: "Rent",
      isParent: false,
      parentCategoryId: "food",
      isDisabled: false,
      categoryType: CategoryType.EXPENSE,
    });
  });

  it("seeds the edit form and builds an update, omitting an empty parent", () => {
    const leaf = category({
      id: "rent",
      name: "Rent",
      isParent: false,
      parentCategoryId: "home",
      isDisabled: true,
    });
    const values = categoryFormFrom(leaf);
    expect(values).toMatchObject({
      name: "Rent",
      isDisabled: true,
      parentCategoryId: "home",
    });
    expect(toUpdateCategoryInput("rent", values)).toEqual({
      id: "rent",
      name: "Rent",
      isDisabled: true,
      parentCategoryId: "home",
    });
    expect(
      toUpdateCategoryInput("rent", { ...values, parentCategoryId: "" })
        .parentCategoryId,
    ).toBeUndefined();
  });

  it("offers sorted top-level categories as parents, minus the excluded one", () => {
    const categories = [
      category({ id: "b", name: "Bills" }),
      category({ id: "a", name: "Auto" }),
      category({ id: "c", name: "Child", isParent: false, parentCategoryId: "a" }),
    ];
    expect(parentCategoryOptions(categories)).toEqual([
      { value: "a", label: "Auto" },
      { value: "b", label: "Bills" },
    ]);
    expect(parentCategoryOptions(categories, "a")).toEqual([
      { value: "b", label: "Bills" },
    ]);
    expect(categories.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });
});
