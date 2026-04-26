import { rollUpBudgetByType } from "../budgetRollups";
import {
  MATRIX_VALUE_CELL_LINE_HEIGHT,
  YEAR_DIVIDER_LEFT,
  formatMatrixValue,
  totalForMode,
  type MatrixValueMode,
} from "../budgetMatrix";
import { yearMonthKey, type YearMonth } from "../../../utils/monthRange";

type MatrixTotalsFooterProps = {
  months: YearMonth[];
  nowYm: YearMonth;
  valueMode: MatrixValueMode;
  monthSummaries: Map<string, ReturnType<typeof rollUpBudgetByType>>;
  border: string;
};

export function MatrixTotalsFooter({
  months,
  nowYm,
  valueMode,
  monthSummaries,
  border,
}: MatrixTotalsFooterProps) {
  return (
    <tfoot>
      <tr>
        <td
          style={{
            position: "sticky",
            left: 0,
            zIndex: 1,
            padding: "8px 12px",
            fontSize: "var(--mantine-font-size-sm)",
            fontWeight: 700,
            background: "var(--mantine-color-gray-0)",
            borderRight: border,
            borderTop: "2px solid var(--mantine-color-default-border)",
            borderBottom: border,
            boxShadow: "4px 0 8px rgba(0,0,0,0.04)",
            verticalAlign: "middle",
          }}
        >
          Total
        </td>
        {months.map((ym) => {
          const summary = monthSummaries.get(yearMonthKey(ym))!;
          const total = totalForMode(summary, valueMode);
          const isCurrent = ym.year === nowYm.year && ym.month === nowYm.month;
          const isYearStart = ym.month === 1;
          return (
            <td
              key={yearMonthKey(ym)}
              style={{
                padding: "8px 8px",
                textAlign: "right",
                fontSize: "var(--mantine-font-size-sm)",
                lineHeight: MATRIX_VALUE_CELL_LINE_HEIGHT,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
                borderRight: border,
                borderTop: "2px solid var(--mantine-color-default-border)",
                borderBottom: border,
                background: isCurrent
                  ? "var(--mantine-color-brand-0)"
                  : "var(--mantine-color-gray-0)",
                verticalAlign: "middle",
              }}
            >
              {formatMatrixValue(total)}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}
