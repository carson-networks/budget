import type {
  Budget,
  Category,
  TransactionTotalsByMonth,
} from "../../../models";
import { yearMonthKey, type YearMonth } from "../../../utils/monthRange.js";
import { effectiveBudgetForMonth } from "../budgetEffective.js";
import {
  rollUpBudgetByType,
  type BudgetRollupSummary,
} from "../budgetRollups.js";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../../Category/CategoriesView/categorySegments.js";

export type MatrixMonthData = {
  budgets: Map<string, string>;
  actuals: Map<string, number>;
  summary: BudgetRollupSummary;
};

export function buildBudgetMatrixData(
  categories: Category[],
  budgets: Budget[],
  totals: TransactionTotalsByMonth | undefined,
  months: YearMonth[],
) {
  const visible = categories.filter((category) => !category.isDisabled);
  const totalsByMonth = new Map(
    totals?.byMonth.map((month) => [yearMonthKey(month), month.byCategory]),
  );
  const monthData = new Map<string, MatrixMonthData>();
  for (const month of months) {
    const key = yearMonthKey(month);
    const budgetById = new Map<string, string>();
    const actualById = new Map<string, number>();
    for (const category of visible) {
      const amount = effectiveBudgetForMonth(budgets, category.id, month);
      if (amount !== undefined) budgetById.set(category.id, amount);
    }
    for (const row of totalsByMonth.get(key) ?? []) {
      const amount = Number(row.total);
      if (Number.isFinite(amount)) actualById.set(row.categoryId, amount);
    }
    monthData.set(key, {
      budgets: budgetById,
      actuals: actualById,
      summary: rollUpBudgetByType(
        visible,
        (id) => (budgetById.has(id) ? Number(budgetById.get(id)) : undefined),
        (id) => actualById.get(id),
      ),
    });
  }
  return {
    segments: sortCategorySegmentsForDisplay(buildCategorySegments(visible)),
    monthData,
  };
}
