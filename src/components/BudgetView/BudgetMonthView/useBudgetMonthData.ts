import { useMemo } from "react";
import { useAllCategories } from "../../../hooks/useCategories";
import { useBudgetsForRange } from "../../../hooks/useBudgets";
import { useAllTransactions } from "../../../hooks/useTransactions";
import { rollUpBudgetByType } from "../budgetRollups";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../../../utils/categorySegments";
import type { YearMonth } from "../../../utils/monthRange";
import { effectiveBudgetForMonth } from "../budgetEffective";
import { transactionYearMonth } from "../transactionMonthBuckets";

export function useBudgetMonthData(selectedMonth: YearMonth) {
  const { categories, isLoading: categoriesLoading } = useAllCategories();
  const { transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: budgetsResponse, error: budgetsError } = useBudgetsForRange(
    selectedMonth,
    selectedMonth,
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

  const budgetByCategoryId = useMemo(() => {
    const sparse = budgetsResponse?.budgets ?? [];
    const m = new Map<string, string>();
    for (const c of visibleCategories) {
      const amt = effectiveBudgetForMonth(sparse, c.id, selectedMonth);
      if (amt !== undefined) m.set(c.id, amt);
    }
    return m;
  }, [budgetsResponse, selectedMonth, visibleCategories]);

  const actualByCategoryId = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      const ym = transactionYearMonth(t);
      if (
        !ym ||
        ym.year !== selectedMonth.year ||
        ym.month !== selectedMonth.month
      ) {
        continue;
      }
      const cid = t.categoryId;
      if (!cid) continue;
      const amt = parseFloat(t.amount);
      if (Number.isNaN(amt)) continue;
      m.set(cid, (m.get(cid) ?? 0) + amt);
    }
    return m;
  }, [transactions, selectedMonth]);

  const monthSummary = useMemo(
    () =>
      rollUpBudgetByType(
        visibleCategories,
        (id) => {
          const raw = budgetByCategoryId.get(id);
          if (raw === undefined) return undefined;
          const n = parseFloat(raw);
          return Number.isNaN(n) ? undefined : n;
        },
        (id) => actualByCategoryId.get(id),
      ),
    [visibleCategories, budgetByCategoryId, actualByCategoryId],
  );

  const isLoading = categoriesLoading || transactionsLoading;
  const budgetsReady = !!budgetsResponse;
  const showFullLoader = isLoading || (!budgetsReady && !budgetsError);

  return {
    segments,
    budgetByCategoryId,
    actualByCategoryId,
    monthSummary,
    showFullLoader,
    budgetsError,
    budgetsReady,
  };
}
