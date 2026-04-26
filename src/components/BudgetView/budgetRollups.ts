import type { Category } from "../../gen/category/v1/category_pb.js";
import { CategoryType } from "../../gen/category/v1/category_pb.js";

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

type BudgetRollupSummary = {
  income: BudgetLineTotals;
  expense: BudgetLineTotals;
  net: BudgetLineTotals;
};

function isIncome(c: Category): boolean {
  return c.categoryType === CategoryType.INCOME;
}

function isExpense(c: Category): boolean {
  return (
    c.categoryType === CategoryType.EXPENSE ||
    c.categoryType === CategoryType.UNSPECIFIED
  );
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
