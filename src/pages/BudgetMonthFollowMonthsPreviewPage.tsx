import { useState } from "react";
import { Box } from "@mantine/core";
import { CategoryKind, type Category } from "../models";
import { ViewShell } from "../components/shared/ViewShell.js";
import { MonthNavigationBar } from "../components/BudgetView/BudgetMonthView/MonthNavigationBar.js";
import { SegmentBudgetTable } from "../components/BudgetView/BudgetMonthView/SegmentBudgetTable.js";
import { MonthTotalsTable } from "../components/BudgetView/BudgetMonthView/MonthTotalsTable.js";
import type { CategorySegment } from "../components/Category/CategoriesView/categorySegments.js";
import { rollUpBudgetByType } from "../components/BudgetView/budgetRollups.js";

/**
 * Local-only preview for demo capture. Not wired into App routes in commits.
 */
export function BudgetMonthFollowMonthsPreviewPage() {
  const [applyToFollowingMonths, setApplyToFollowingMonths] = useState(false);
  const selectedMonth = { year: 2025, month: 3 };

  const foodParent: Category = {
    id: "food",
    name: "Food",
    isParent: true,
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
  };
  const groceries: Category = {
    id: "groceries",
    name: "Groceries",
    isParent: false,
    parentCategoryId: "food",
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
  };
  const salary: Category = {
    id: "salary",
    name: "Salary",
    isParent: false,
    isDisabled: false,
    categoryKind: CategoryKind.Income,
  };

  const foodSegment: CategorySegment = {
    root: foodParent,
    children: [groceries],
  };
  const salarySegment: CategorySegment = {
    root: salary,
    children: [],
  };

  const budgetByCategoryId = new Map([
    ["groceries", "400"],
    ["salary", "5000"],
  ]);
  const actualByCategoryId = new Map([
    ["groceries", -320],
    ["salary", 5000],
  ]);

  const monthSummary = rollUpBudgetByType(
    [foodParent, groceries, salary],
    (id) => {
      const raw = budgetByCategoryId.get(id);
      return raw === undefined ? undefined : parseFloat(raw);
    },
    (id) => actualByCategoryId.get(id),
  );

  return (
    <ViewShell title="Budget">
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
        <MonthNavigationBar
          selectedMonth={selectedMonth}
          onPrev={() => undefined}
          onNext={() => undefined}
          onGoToToday={() => undefined}
          applyToFollowingMonths={applyToFollowingMonths}
          onApplyToFollowingMonthsChange={setApplyToFollowingMonths}
        />
        <SegmentBudgetTable
          segment={foodSegment}
          selectedMonth={selectedMonth}
          budgetByCategoryId={budgetByCategoryId}
          actualByCategoryId={actualByCategoryId}
          overwriteFutureMonths={applyToFollowingMonths}
        />
        <SegmentBudgetTable
          segment={salarySegment}
          selectedMonth={selectedMonth}
          budgetByCategoryId={budgetByCategoryId}
          actualByCategoryId={actualByCategoryId}
          overwriteFutureMonths={applyToFollowingMonths}
        />
        <MonthTotalsTable monthSummary={monthSummary} />
      </Box>
    </ViewShell>
  );
}
