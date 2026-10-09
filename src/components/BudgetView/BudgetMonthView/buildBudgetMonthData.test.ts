import { describe, expect, it } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { buildBudgetMonthData } from "./buildBudgetMonthData.js";

const category = (overrides: Partial<Category> & { id: string }): Category => ({
  name: overrides.id,
  isParent: false,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
  ...overrides,
});

const food = category({ id: "food", isParent: true });
const groceries = category({ id: "groceries", parentCategoryId: "food" });
const salary = category({ id: "salary", categoryKind: CategoryKind.Income });
const hidden = category({ id: "hidden", isDisabled: true });
const march = { year: 2025, month: 3 };

describe("buildBudgetMonthData", () => {
  it("carries budgets forward and reads actuals for the selected month only", () => {
    const data = buildBudgetMonthData(
      [food, groceries, salary],
      [
        { categoryId: "groceries", year: 2025, month: 1, amount: "300" },
        { categoryId: "salary", year: 2025, month: 3, amount: "5000" },
      ],
      {
        byMonth: [
          { year: 2025, month: 2, byCategory: [{ categoryId: "groceries", total: "-1" }] },
          {
            year: 2025,
            month: 3,
            byCategory: [
              { categoryId: "groceries", total: "-320.50" },
              { categoryId: "salary", total: "bad" },
            ],
          },
        ],
      },
      march,
    );

    expect(data.budgetByCategoryId).toEqual(
      new Map([
        ["groceries", "300"],
        ["salary", "5000"],
      ]),
    );
    expect(data.actualByCategoryId).toEqual(new Map([["groceries", -320.5]]));
    expect(data.segments.map((s) => s.root.id)).toContain("food");
    expect(data.monthSummary).toBeDefined();
  });

  it("leaves disabled categories out of every output", () => {
    const data = buildBudgetMonthData(
      [hidden],
      [{ categoryId: "hidden", year: 2025, month: 3, amount: "10" }],
      undefined,
      march,
    );
    expect(data.segments).toEqual([]);
    expect(data.budgetByCategoryId.size).toBe(0);
  });

  it("returns empty maps before totals have loaded", () => {
    const data = buildBudgetMonthData([salary], [], undefined, march);
    expect(data.actualByCategoryId.size).toBe(0);
    expect(data.budgetByCategoryId.size).toBe(0);
  });
});
