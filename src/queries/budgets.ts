import {
  keepPreviousData,
  mutationOptions,
  queryOptions,
} from "@tanstack/react-query";
import { budgetClient } from "../connectRPC/connect.js";
import { mapBudget, type SetBudgetInput } from "../models";
import type { YearMonth } from "../utils/monthRange.js";
import { invalidatesOnSettled } from "./invalidate.js";
import { rpc } from "./rpc.js";

export const budgetQueries = {
  all: () => ["budgets"] as const,

  /** Budgets for an inclusive calendar range (`data` is `Budget[]`). */
  range: (start: YearMonth, end: YearMonth) =>
    queryOptions({
      queryKey: [
        ...budgetQueries.all(),
        "range",
        start.year,
        start.month,
        end.year,
        end.month,
      ] as const,
      queryFn: () =>
        rpc(
          budgetClient.listBudgets({
            startMonth: start.month,
            startYear: start.year,
            endMonth: end.month,
            endYear: end.year,
          }),
        ),
      placeholderData: keepPreviousData,
      select: (response) => (response.budgets ?? []).filter(Boolean).map(mapBudget),
    }),
};

export const budgetMutations = {
  set: mutationOptions({
    mutationKey: ["budgets", "set"],
    mutationFn: (vars: SetBudgetInput) =>
      rpc(
        budgetClient.setBudget({
          categoryId: vars.categoryId,
          year: vars.year,
          month: vars.month,
          amount: vars.amount,
          overwriteFutureMonths: vars.overwriteFutureMonths,
        }),
      ),
    ...invalidatesOnSettled(budgetQueries.all()),
  }),
};
