import type { CategoryKind } from "../../../models";
import {
  categoryBudgetDifference,
  type BudgetRollupSummary,
} from "../budgetRollups.js";

export const INITIAL_MONTHS_EACH_SIDE = 36;
export const EXTEND_CHUNK = 12;
export const EDGE_THRESHOLD_PX = 100;
export const MAX_TOTAL_MONTHS = 500;
export const MONTH_COLUMN_PX = 100;
export const CATEGORY_COLUMN_PX = 220;

export type MatrixValueMode = "budgeted" | "actual" | "net";

export function matrixCellNumber(
  mode: MatrixValueMode,
  kind: CategoryKind,
  budgetRaw: string | undefined,
  actual: number | undefined,
): number | undefined {
  const parsed = budgetRaw === undefined ? NaN : Number(budgetRaw);
  const budget = Number.isFinite(parsed) ? parsed : undefined;
  if (mode === "budgeted") return budget;
  if (mode === "actual") return actual;
  return categoryBudgetDifference(kind, budget, actual);
}

export function totalForMode(
  summary: BudgetRollupSummary,
  mode: MatrixValueMode,
): number {
  if (mode === "budgeted") return summary.net.budget;
  if (mode === "actual") return summary.net.actual;
  return summary.net.difference;
}

export function formatMatrixValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
