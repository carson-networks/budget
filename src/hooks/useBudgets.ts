import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { ListBudgetsResponse } from "../connectRPC/types.js";
import { mapBudget, type Budget, type SetBudgetInput } from "../models";
import type { YearMonth } from "../utils/monthRange.js";

function budgetsQueryKey(start: YearMonth, end: YearMonth) {
  return [
    "budgets",
    start.year,
    start.month,
    end.year,
    end.month,
  ] as const;
}

/** Fetches budgets for an inclusive calendar range (month values 1–12). */
export function useBudgetsForRange(start: YearMonth, end: YearMonth) {
  const query = useQuery<ListBudgetsResponse, Error>({
    queryKey: budgetsQueryKey(start, end),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        return await budgetClient.listBudgets({
          startMonth: start.month,
          startYear: start.year,
          endMonth: end.month,
          endYear: end.year,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
  });

  const budgets: Budget[] = (query.data?.budgets ?? [])
    .filter(Boolean)
    .map(mapBudget);

  return {
    ...query,
    budgets,
  };
}

export function useSetBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: SetBudgetInput) => {
      try {
        await budgetClient.setBudget({
          categoryId: vars.categoryId,
          year: vars.year,
          month: vars.month,
          amount: vars.amount,
          overwriteFutureMonths: vars.overwriteFutureMonths,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
