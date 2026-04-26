import { CategoryType } from "../../hooks/useCategories";
import { rollUpBudgetByType } from "./budgetRollups";

/** Starting window: months on each side of “today” (inclusive span = 2× + 1). */
export const INITIAL_MONTHS_EACH_SIDE = 36;
/** How many months to add when scrolling near an edge. */
export const EXTEND_CHUNK = 12;
/** Distance from horizontal edge (px) that triggers loading more months. */
export const EDGE_THRESHOLD_PX = 100;
/** Cap total months in the matrix to avoid unbounded memory use (~41 years). */
export const MAX_TOTAL_MONTHS = 500;

/** Fixed column width so scroll compensation stays in sync with “current month” index. */
export const MONTH_COLUMN_PX = 100;
export const CATEGORY_COLUMN_MIN_PX = 220;

/** Left edge of January columns — strong rule between calendar years. */
export const YEAR_DIVIDER_LEFT = "3px solid var(--mantine-color-dark-5)";

/** Keeps Budgeted (input) and Actual/Net (text) rows the same height. */
export const MATRIX_VALUE_CELL_LINE_HEIGHT = 1.45;

export type MatrixValueMode = "budgeted" | "actual" | "net";

export function displayMatrixCategoryType(type: CategoryType): string {
  return type === CategoryType.INCOME ? "Income" : "Expense";
}

export function formatMatrixValue(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseBudgetAmount(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

function categoryVariance(
  categoryType: CategoryType,
  budget: number | undefined,
  actual: number | undefined,
): number {
  const b = budget ?? 0;
  const a = actual ?? 0;
  if (categoryType === CategoryType.INCOME) return a - b;
  return b + a;
}

/** Single numeric cell for the matrix; `undefined` means show an em dash. */
export function matrixCellNumber(
  mode: MatrixValueMode,
  categoryType: CategoryType,
  budgetRaw: string | undefined,
  actual: number | undefined,
): number | undefined {
  const budgetNum = parseBudgetAmount(budgetRaw);
  if (mode === "budgeted") return budgetNum;
  if (mode === "actual") {
    if (actual === undefined) return undefined;
    return actual;
  }
  return categoryVariance(categoryType, budgetNum, actual);
}

export function totalForMode(
  summary: ReturnType<typeof rollUpBudgetByType>,
  mode: MatrixValueMode,
): number {
  if (mode === "budgeted") return summary.net.budget;
  if (mode === "actual") return summary.net.actual;
  return summary.net.difference;
}
