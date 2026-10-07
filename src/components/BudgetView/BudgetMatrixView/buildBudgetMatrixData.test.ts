import { describe, expect, it } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { buildBudgetMatrixData } from "./buildBudgetMatrixData.js";

const category = (id: string, overrides: Partial<Category> = {}): Category => ({
  id,
  name: id,
  categoryKind: CategoryKind.Expense,
  isParent: false,
  isDisabled: false,
  ...overrides,
});
const months = [
  { year: 2025, month: 12 },
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
];

describe("buildBudgetMatrixData", () => {
  it("carries sparse budgets across years, replaces them, and preserves explicit zero", () => {
    const { monthData } = buildBudgetMatrixData(
      [category("food")],
      [
        { categoryId: "food", year: 2026, month: 2, amount: "0" },
        { categoryId: "food", year: 2025, month: 10, amount: "400" },
        { categoryId: "food", year: 2026, month: 1, amount: "500" },
        { categoryId: "food", year: 2026, month: 3, amount: "900" },
      ],
      undefined,
      months,
    );
    expect(
      [...monthData.values()].map((month) => month.budgets.get("food")),
    ).toEqual(["400", "500", "0"]);
    expect(monthData.get("2025-12")?.actuals.size).toBe(0);
  });

  it("groups enabled categories and isolates monthly actuals and summaries", () => {
    const categories = [
      category("salary", { categoryKind: CategoryKind.Income }),
      category("disabled", { isDisabled: true }),
      category("food", { isParent: true }),
      category("groceries", { parentCategoryId: "food" }),
    ];
    const { segments, monthData } = buildBudgetMatrixData(
      categories,
      [
        { categoryId: "groceries", year: 2025, month: 12, amount: "400" },
        { categoryId: "salary", year: 2025, month: 12, amount: "5000" },
        { categoryId: "disabled", year: 2025, month: 12, amount: "99999" },
      ],
      {
        byMonth: [
          {
            year: 2025,
            month: 12,
            byCategory: [
              { categoryId: "salary", total: "5100" },
              { categoryId: "groceries", total: "-320.50" },
              { categoryId: "disabled", total: "99999" },
              { categoryId: "food", total: "invalid" },
            ],
          },
          {
            year: 2026,
            month: 1,
            byCategory: [{ categoryId: "groceries", total: "0" }],
          },
        ],
      },
      months,
    );
    expect(segments.map((segment) => segment.root.id)).toEqual([
      "food",
      "salary",
    ]);
    expect(segments[0].children.map((child) => child.id)).toEqual([
      "groceries",
    ]);
    const december = monthData.get("2025-12")!;
    expect(december.actuals.get("food")).toBeUndefined();
    expect(december.summary.net).toEqual({
      budget: 4600,
      actual: 4779.5,
      difference: 179.5,
    });
    expect(monthData.get("2026-01")?.actuals.get("groceries")).toBe(0);
    expect(monthData.get("2026-02")?.actuals.get("groceries")).toBeUndefined();
    expect(monthData.get("2026-02")?.summary.net.actual).toBe(0);
  });
});
