import { describe, expect, it } from "vitest";
import { CategoryKind, type Category } from "../../models";
import {
  categoryBudgetDifference,
  rollUpBudgetByType,
} from "./budgetRollups.js";

function cat(
  partial: Pick<Category, "id" | "name" | "categoryKind"> &
    Partial<Category>,
): Category {
  return {
    isParent: false,
    isDisabled: false,
    ...partial,
  };
}

describe("rollUpBudgetByType", () => {
  const categories: Category[] = [
    cat({ id: "salary", name: "Salary", categoryKind: CategoryKind.Income }),
    cat({ id: "food", name: "Food", categoryKind: CategoryKind.Expense }),
    cat({
      id: "misc",
      name: "Misc",
      categoryKind: CategoryKind.Unspecified,
    }),
  ];

  it("sums income and expense lines and derives net / difference", () => {
    const budget = new Map([
      ["salary", 5000],
      ["food", 400],
      ["misc", 50],
    ]);
    const actual = new Map([
      ["salary", 5100],
      ["food", -350],
      ["misc", -40],
    ]);

    const summary = rollUpBudgetByType(
      categories,
      (id) => budget.get(id),
      (id) => actual.get(id),
    );

    expect(summary.income).toEqual({
      budget: 5000,
      actual: 5100,
      difference: 100,
    });
    expect(summary.expense).toEqual({
      budget: 450,
      actual: -390,
      difference: 60,
    });
    expect(summary.net).toEqual({
      budget: 4550,
      actual: 4710,
      difference: 160,
    });
  });

  it("skips missing budget/actual values", () => {
    const summary = rollUpBudgetByType(
      categories,
      (id) => (id === "salary" ? 1000 : undefined),
      () => undefined,
    );
    expect(summary.income.budget).toBe(1000);
    expect(summary.expense.budget).toBe(0);
    expect(summary.net.actual).toBe(0);
  });
});

describe("categoryBudgetDifference", () => {
  it("matches income and expense formulas used in totals", () => {
    expect(
      categoryBudgetDifference(CategoryKind.Income, 5000, 5100),
    ).toBe(100);
    expect(
      categoryBudgetDifference(CategoryKind.Expense, 400, -320),
    ).toBe(80);
    expect(
      categoryBudgetDifference(CategoryKind.Expense, undefined, undefined),
    ).toBeUndefined();
  });
});
