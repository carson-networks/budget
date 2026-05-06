import type { Budget as WireBudget } from "../network/types.js";

export type Budget = {
  categoryId: string;
  month: number;
  year: number;
  amount: string;
};

export type ListBudgetsRange = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

export type SetBudgetInput = {
  categoryId: string;
  month: number;
  year: number;
  amount: string;
  overwriteFutureMonths: boolean;
};

export function mapBudget(wire: WireBudget): Budget {
  return {
    categoryId: wire.categoryId,
    month: wire.month,
    year: wire.year,
    amount: wire.amount,
  };
}
