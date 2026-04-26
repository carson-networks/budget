import { useMemo } from "react";
import { useAllCategories } from "../../../hooks/useCategories";
import { useBudgetsForRange } from "../../../hooks/useBudgets";
import { useAllTransactions } from "../../../hooks/useTransactions";
import { rollUpBudgetByType } from "../budgetRollups";
import { buildActualsByYearMonth } from "../transactionMonthBuckets";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../../../utils/categorySegments";
import { buildEffectiveBudgetKeyMap } from "../budgetEffective";
import { yearMonthKey, type YearMonth } from "../../../utils/monthRange";

export function useBudgetMatrixData(
  rangeStart: YearMonth,
  rangeEnd: YearMonth,
  months: YearMonth[],
) {
  const { categories, isLoading: categoriesLoading } = useAllCategories();
  const { transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: budgetsResponse, error } = useBudgetsForRange(
    rangeStart,
    rangeEnd,
  );

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.isDisabled),
    [categories],
  );

  const segments = useMemo(
    () =>
      sortCategorySegmentsForDisplay(buildCategorySegments(visibleCategories)),
    [visibleCategories],
  );

  const effectiveBudgetByKey = useMemo(() => {
    const list = budgetsResponse?.budgets ?? [];
    const ids = visibleCategories.map((c) => c.id);
    return buildEffectiveBudgetKeyMap(list, ids, months);
  }, [budgetsResponse, visibleCategories, months]);

  const actualsByYearMonth = useMemo(
    () => buildActualsByYearMonth(transactions),
    [transactions],
  );

  const monthSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof rollUpBudgetByType>>();
    for (const ym of months) {
      const k = yearMonthKey(ym);
      const actualMap = actualsByYearMonth.get(k) ?? new Map<string, number>();
      map.set(
        k,
        rollUpBudgetByType(
          visibleCategories,
          (id) => {
            const raw = effectiveBudgetByKey.get(`${id}|${ym.year}|${ym.month}`);
            if (raw === undefined) return undefined;
            const n = parseFloat(raw);
            return Number.isNaN(n) ? undefined : n;
          },
          (id) => actualMap.get(id),
        ),
      );
    }
    return map;
  }, [months, visibleCategories, effectiveBudgetByKey, actualsByYearMonth]);

  const budgetsReady = !!budgetsResponse;
  const showFullLoader =
    categoriesLoading ||
    transactionsLoading ||
    (!budgetsReady && !error);

  return {
    segments,
    effectiveBudgetByKey,
    actualsByYearMonth,
    monthSummaries,
    budgetsResponse,
    budgetsReady,
    showFullLoader,
    error,
  };
}
