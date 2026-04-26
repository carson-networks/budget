import { useSetBudget } from "../../../hooks/useBudgets";
import { CategoryType } from "../../../hooks/useCategories";
import type { YearMonth } from "../../../utils/monthRange";
import {
  MATRIX_VALUE_CELL_LINE_HEIGHT,
  YEAR_DIVIDER_LEFT,
  formatMatrixValue,
  matrixCellNumber,
  type MatrixValueMode,
} from "../budgetMatrix";
import { BudgetCellInput } from "../shared/BudgetCellInput.tsx";

type MatrixBudgetCellProps = {
  ym: YearMonth;
  categoryId: string;
  budgetRaw: string | undefined;
  applyToFutureMonths: boolean;
  compact?: boolean;
  fw?: 600;
};

/** Keeps `useSetBudget` scoped to cells that actually render the budget editor. */
function MatrixBudgetCell({
  ym,
  categoryId,
  budgetRaw,
  applyToFutureMonths,
  compact,
  fw,
}: MatrixBudgetCellProps) {
  const setBudget = useSetBudget();
  return (
    <BudgetCellInput
      amountStr={budgetRaw}
      onCommit={(amount) =>
        setBudget.mutateAsync({
          categoryId,
          year: ym.year,
          month: ym.month,
          amount,
          overwriteFutureMonths: applyToFutureMonths,
        })
      }
      saving={
        setBudget.isPending &&
        setBudget.variables?.categoryId === categoryId &&
        setBudget.variables?.year === ym.year &&
        setBudget.variables?.month === ym.month
      }
      fw={fw}
      compact={compact}
    />
  );
}

type MatrixDataCellProps = {
  ym: YearMonth;
  nowYm: YearMonth;
  categoryId: string;
  categoryType: CategoryType;
  valueMode: MatrixValueMode;
  budgetRaw: string | undefined;
  actualNum: number | undefined;
  applyToFutureMonths: boolean;
  compact?: boolean;
  fw?: 600;
  border: string;
  /** Background when the column is not the current month (e.g. segment header row). */
  nonCurrentBackground?: string;
};

export function MatrixDataCell({
  ym,
  nowYm,
  categoryId,
  categoryType,
  valueMode,
  budgetRaw,
  actualNum,
  applyToFutureMonths,
  compact,
  fw,
  border,
  nonCurrentBackground,
}: MatrixDataCellProps) {
  const cellNum = matrixCellNumber(
    valueMode,
    categoryType,
    budgetRaw,
    actualNum,
  );
  const isCurrent = ym.year === nowYm.year && ym.month === nowYm.month;
  const isYearStart = ym.month === 1;
  const isEmpty = cellNum === undefined;

  return (
    <td
      style={{
        padding: "8px 8px",
        textAlign: "right",
        fontSize: "var(--mantine-font-size-sm)",
        lineHeight: MATRIX_VALUE_CELL_LINE_HEIGHT,
        fontVariantNumeric: "tabular-nums",
        fontWeight: fw ?? undefined,
        borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
        borderRight: border,
        borderBottom: border,
        background: isCurrent
          ? "var(--mantine-color-brand-0)"
          : nonCurrentBackground,
        color:
          valueMode !== "budgeted" && isEmpty
            ? "var(--mantine-color-dimmed)"
            : undefined,
        verticalAlign: "middle",
      }}
    >
      {valueMode === "budgeted" ? (
        <MatrixBudgetCell
          ym={ym}
          categoryId={categoryId}
          budgetRaw={budgetRaw}
          applyToFutureMonths={applyToFutureMonths}
          fw={fw}
          compact={compact}
        />
      ) : isEmpty ? (
        "—"
      ) : (
        formatMatrixValue(cellNum)
      )}
    </td>
  );
}
