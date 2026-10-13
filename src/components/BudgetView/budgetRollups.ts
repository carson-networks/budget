import { CategoryKind, type Category } from "../../models";

type BudgetLineTotals = {
  budget: number;
  actual: number;
  /**
   * Income: actual − budget.
   * Expense: budget + actual (remaining when outflows are negative).
   * Net: net actual − net budget (income − expense budgets vs cash flow).
   */
  difference: number;
};

export type BudgetRollupSummary = {
  income: BudgetLineTotals;
  expense: BudgetLineTotals;
  net: BudgetLineTotals;
};

function isIncome(c: Category): boolean {
  return c.categoryKind === CategoryKind.Income;
}

function isExpense(c: Category): boolean {
  return (
    c.categoryKind === CategoryKind.Expense ||
    c.categoryKind === CategoryKind.Unspecified
  );
}

/**
 * Per-category difference using the same formulas as month totals.
 * Returns `undefined` when both budget and actual are missing.
 */
export function categoryBudgetDifference(
  categoryKind: CategoryKind,
  budget: number | undefined,
  actual: number | undefined,
): number | undefined {
  if (budget === undefined && actual === undefined) return undefined;
  const b = budget ?? 0;
  const a = actual ?? 0;
  if (categoryKind === CategoryKind.Income) return a - b;
  return b + a;
}

export function rollUpBudgetByType(
  visibleCategories: Category[],
  getBudget: (categoryId: string) => number | undefined,
  getActual: (categoryId: string) => number | undefined,
): BudgetRollupSummary {
  let incomeBudget = 0;
  let incomeActual = 0;
  let expenseBudget = 0;
  let expenseActual = 0;

  for (const c of visibleCategories) {
    if (isIncome(c)) {
      const b = getBudget(c.id);
      if (b !== undefined && !Number.isNaN(b)) incomeBudget += b;
      const a = getActual(c.id);
      if (a !== undefined && !Number.isNaN(a)) incomeActual += a;
    } else if (isExpense(c)) {
      const b = getBudget(c.id);
      if (b !== undefined && !Number.isNaN(b)) expenseBudget += b;
      const a = getActual(c.id);
      if (a !== undefined && !Number.isNaN(a)) expenseActual += a;
    }
  }

  const incomeDiff = incomeActual - incomeBudget;
  const expenseDiff = expenseBudget + expenseActual;

  const netBudget = incomeBudget - expenseBudget;
  const netActual = incomeActual + expenseActual;
  const netDiff = netActual - netBudget;

  return {
    income: {
      budget: incomeBudget,
      actual: incomeActual,
      difference: incomeDiff,
    },
    expense: {
      budget: expenseBudget,
      actual: expenseActual,
      difference: expenseDiff,
    },
    net: {
      budget: netBudget,
      actual: netActual,
      difference: netDiff,
    },
  };
}
