import { Fragment } from "react";
import type { CategorySegment } from "../../Category/CategoriesView/categorySegments.js";
import {
  compareYearMonth,
  formatYearMonthLabel,
  yearMonthKey,
  type YearMonth,
} from "../../../utils/monthRange.js";
import {
  CATEGORY_COLUMN_PX,
  MONTH_COLUMN_PX,
  formatMatrixValue,
  totalForMode,
  type MatrixValueMode,
} from "./budgetMatrix.js";
import type { MatrixMonthData } from "./buildBudgetMatrixData.js";
import { MatrixCategoryRow } from "./MatrixCategoryRow.js";

type Props = {
  segments: CategorySegment[];
  months: YearMonth[];
  nowYm: YearMonth;
  monthData: Map<string, MatrixMonthData>;
  valueMode: MatrixValueMode;
  applyToFutureMonths: boolean;
  isRefreshing: boolean;
};

export function MatrixTable({ segments, ...props }: Props) {
  const { months, nowYm, monthData, valueMode } = props;
  const monthAttributes = (month: YearMonth) => ({
    "data-current": compareYearMonth(month, nowYm) === 0 || undefined,
    "data-year-start": month.month === 1 || undefined,
  });
  return (
    <table
      aria-label="Budget matrix"
      aria-busy={props.isRefreshing}
      className="budget-matrix"
      style={{ width: CATEGORY_COLUMN_PX + months.length * MONTH_COLUMN_PX }}
    >
      <colgroup>
        <col style={{ width: CATEGORY_COLUMN_PX }} />
        {months.map((month) => (
          <col key={yearMonthKey(month)} style={{ width: MONTH_COLUMN_PX }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Category</th>
          {months.map((month) => (
            <th
              scope="col"
              key={yearMonthKey(month)}
              {...monthAttributes(month)}
            >
              {formatYearMonthLabel(month)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {segments.map((segment) => (
          <Fragment key={segment.root.id}>
            <MatrixCategoryRow {...props} category={segment.root} root />
            {segment.children.map((category) => (
              <MatrixCategoryRow
                key={category.id}
                {...props}
                category={category}
              />
            ))}
          </Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          {months.map((month) => {
            const summary = monthData.get(yearMonthKey(month))?.summary;
            return (
              <td key={yearMonthKey(month)} {...monthAttributes(month)}>
                {summary
                  ? formatMatrixValue(totalForMode(summary, valueMode))
                  : "—"}
              </td>
            );
          })}
        </tr>
      </tfoot>
    </table>
  );
}
