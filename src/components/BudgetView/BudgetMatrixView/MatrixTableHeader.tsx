import { formatYearMonthLabel, yearMonthKey, type YearMonth } from "../../../utils/monthRange";
import {
  MONTH_COLUMN_PX,
  CATEGORY_COLUMN_MIN_PX,
  YEAR_DIVIDER_LEFT,
} from "../budgetMatrix";

type MatrixTableHeaderProps = {
  months: YearMonth[];
  nowYm: YearMonth;
  headerBg: string;
  border: string;
};

export function MatrixTableHeader({
  months,
  nowYm,
  headerBg,
  border,
}: MatrixTableHeaderProps) {
  return (
    <thead>
      <tr>
        <th
          style={{
            position: "sticky",
            left: 0,
            top: 0,
            zIndex: 4,
            minWidth: CATEGORY_COLUMN_MIN_PX,
            width: CATEGORY_COLUMN_MIN_PX,
            padding: "10px 12px",
            textAlign: "left",
            fontSize: "var(--mantine-font-size-sm)",
            fontWeight: 600,
            background: headerBg,
            borderRight: border,
            borderBottom: border,
            boxShadow: "4px 0 8px rgba(0,0,0,0.04)",
          }}
        >
          Category
        </th>
        {months.map((ym) => {
          const isCurrent = ym.year === nowYm.year && ym.month === nowYm.month;
          const isYearStart = ym.month === 1;
          return (
            <th
              key={yearMonthKey(ym)}
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                minWidth: MONTH_COLUMN_PX,
                width: MONTH_COLUMN_PX,
                padding: "10px 8px",
                textAlign: "right",
                fontSize: "var(--mantine-font-size-xs)",
                fontWeight: isCurrent ? 700 : 600,
                color: isCurrent ? "var(--mantine-color-brand-7)" : undefined,
                background: isCurrent
                  ? "var(--mantine-color-brand-0)"
                  : headerBg,
                borderLeft: isYearStart ? YEAR_DIVIDER_LEFT : undefined,
                borderRight: border,
                borderBottom: border,
                whiteSpace: "nowrap",
              }}
            >
              {formatYearMonthLabel(ym)}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
