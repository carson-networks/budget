import { create } from "@bufbuild/protobuf";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { budgetClient } from "../api/connect";
import { connectErrorMessage } from "../api/errors";
import {
  buildFakeBudgetsForCategories,
  isFakeBudgetData,
  recordFakeBudgetOverride,
} from "../data/fakeData";
import { BudgetSchema, type Budget } from "../gen/budget/v1/budget_pb.js";
import { compareYearMonth, type YearMonth } from "../utils/monthRange";
import { useAllCategories } from "./useCategories";

export type SetBudgetVariables = {
  categoryId: string;
  year: number;
  month: number;
  amount: string;
  overwriteFutureMonths: boolean;
};

type CachedBudgetRange = {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
};

function parseBudgetQueryRange(
  queryKey: readonly unknown[],
): CachedBudgetRange | null {
  if (queryKey[0] !== "budgets") return null;
  const sy = queryKey[1];
  const sm = queryKey[2];
  const ey = queryKey[3];
  const em = queryKey[4];
  if (
    typeof sy !== "number" ||
    typeof sm !== "number" ||
    typeof ey !== "number" ||
    typeof em !== "number"
  ) {
    return null;
  }
  return { startYear: sy, startMonth: sm, endYear: ey, endMonth: em };
}

function patchSingleMonthInResponse(
  old: unknown,
  vars: SetBudgetVariables,
): unknown {
  if (!old || typeof old !== "object" || !("budgets" in old)) return old;
  const response = old as { budgets: Budget[] };
  const idx = response.budgets.findIndex(
    (b) =>
      b.categoryId === vars.categoryId &&
      b.year === vars.year &&
      b.month === vars.month,
  );
  if (idx >= 0) {
    const budgets = [...response.budgets];
    budgets[idx] = { ...budgets[idx], amount: vars.amount };
    return { ...response, budgets };
  }
  return {
    ...response,
    budgets: [
      ...response.budgets,
      create(BudgetSchema, {
        categoryId: vars.categoryId,
        year: vars.year,
        month: vars.month,
        amount: vars.amount,
      }),
    ],
  };
}

/**
 * Matches server: delete explicit rows for this category strictly after the
 * anchor month, then upsert the anchor (carry-forward fills later months in UI).
 */
function patchSparseFutureOverwrite(
  old: unknown,
  vars: SetBudgetVariables,
): unknown {
  if (!old || typeof old !== "object" || !("budgets" in old)) return old;
  const response = old as { budgets: Budget[] };
  const anchor: YearMonth = { year: vars.year, month: vars.month };
  const budgets = response.budgets.filter((b) => {
    if (b.categoryId !== vars.categoryId) return true;
    const bm: YearMonth = { year: b.year, month: b.month };
    return compareYearMonth(bm, anchor) <= 0;
  });
  const idx = budgets.findIndex(
    (b) =>
      b.categoryId === vars.categoryId &&
      b.year === vars.year &&
      b.month === vars.month,
  );
  if (idx >= 0) {
    budgets[idx] = { ...budgets[idx], amount: vars.amount };
  } else {
    budgets.push(
      create(BudgetSchema, {
        categoryId: vars.categoryId,
        year: vars.year,
        month: vars.month,
        amount: vars.amount,
      }),
    );
  }
  return { ...response, budgets };
}

function applyBudgetPatchToQueryData(
  old: unknown,
  vars: SetBudgetVariables,
  _range: CachedBudgetRange,
): unknown {
  if (!vars.overwriteFutureMonths) {
    return patchSingleMonthInResponse(old, vars);
  }
  return patchSparseFutureOverwrite(old, vars);
}

export type BudgetRange = {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
};

function rangeFromYearMonths(start: YearMonth, end: YearMonth): BudgetRange {
  return {
    startYear: start.year,
    startMonth: start.month,
    endYear: end.year,
    endMonth: end.month,
  };
}

/** Fetches budgets for an inclusive calendar range (month values 1–12). */
export function useBudgetsForRange(start: YearMonth, end: YearMonth) {
  const range = rangeFromYearMonths(start, end);
  const { categories, isLoading: categoriesLoading } = useAllCategories();

  const categoryKey = [...categories]
    .map((c) => c.id)
    .sort()
    .join("|");

  return useQuery({
    queryKey: [
      "budgets",
      range.startYear,
      range.startMonth,
      range.endYear,
      range.endMonth,
      isFakeBudgetData(),
      categoryKey,
    ],
    enabled: !categoriesLoading,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (isFakeBudgetData()) {
        return {
          budgets: buildFakeBudgetsForCategories(
            categories,
            { year: range.startYear, month: range.startMonth },
            { year: range.endYear, month: range.endMonth },
          ),
        };
      }
      try {
        return await budgetClient.listBudgets({
          startMonth: range.startMonth,
          startYear: range.startYear,
          endMonth: range.endMonth,
          endYear: range.endYear,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
  });
}

export function useSetBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: SetBudgetVariables) => {
      if (!isFakeBudgetData()) {
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
      }
    },
    onSuccess: (_data, vars) => {
      if (isFakeBudgetData()) {
        recordFakeBudgetOverride(vars);
        for (const query of queryClient.getQueryCache().findAll({
          queryKey: ["budgets"],
          exact: false,
        })) {
          const range = parseBudgetQueryRange(query.queryKey);
          if (!range) continue;
          queryClient.setQueryData(query.queryKey, (old) =>
            applyBudgetPatchToQueryData(old, vars, range),
          );
        }
      } else {
        void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
