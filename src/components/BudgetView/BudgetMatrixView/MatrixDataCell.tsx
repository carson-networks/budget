import type { Category } from "../../../models";
import { compareYearMonth, type YearMonth } from "../../../utils/monthRange.js";
import {
  formatMatrixValue,
  matrixCellNumber,
  type MatrixValueMode,
} from "./budgetMatrix.js";
import { MatrixBudgetInput } from "./MatrixBudgetInput.js";

type Props = {
  category: Category;
  month: YearMonth;
  nowYm: YearMonth;
  valueMode: MatrixValueMode;
  budget: string | undefined;
  actual: number | undefined;
  applyToFutureMonths: boolean;
  isRefreshing: boolean;
};

export function MatrixDataCell({
  category,
  month,
  nowYm,
  valueMode,
  budget,
  actual,
  applyToFutureMonths,
  isRefreshing,
}: Props) {
  const value = matrixCellNumber(
    valueMode,
    category.categoryKind,
    budget,
    actual,
  );
  return (
    <td
      data-current={compareYearMonth(month, nowYm) === 0 || undefined}
      data-year-start={month.month === 1 || undefined}
    >
      {valueMode === "budgeted" && !category.isParent ? (
        <MatrixBudgetInput
          category={category}
          month={month}
          nowYm={nowYm}
          amount={budget}
          applyToFutureMonths={applyToFutureMonths}
          disabled={isRefreshing}
        />
      ) : value === undefined ||
        (valueMode === "budgeted" && category.isParent) ? (
        <span className="budget-matrix-empty">—</span>
      ) : (
        formatMatrixValue(value)
      )}
    </td>
  );
}
