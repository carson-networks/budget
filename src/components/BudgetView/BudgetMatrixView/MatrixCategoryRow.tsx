import { Badge, Group, Text } from "@mantine/core";
import type { Category } from "../../../models";
import { displayCategoryKind } from "../../Category/CategoriesView/categoryDisplay.js";
import { yearMonthKey, type YearMonth } from "../../../utils/monthRange.js";
import type { MatrixMonthData } from "./buildBudgetMatrixData.js";
import type { MatrixValueMode } from "./budgetMatrix.js";
import { MatrixDataCell } from "./MatrixDataCell.js";

type Props = {
  category: Category;
  root?: boolean;
  months: YearMonth[];
  nowYm: YearMonth;
  monthData: Map<string, MatrixMonthData>;
  valueMode: MatrixValueMode;
  applyToFutureMonths: boolean;
  isRefreshing: boolean;
};

export function MatrixCategoryRow({
  category,
  root,
  months,
  nowYm,
  monthData,
  valueMode,
  applyToFutureMonths,
  isRefreshing,
}: Props) {
  return (
    <tr data-root={root || undefined}>
      <th scope="row" title={category.name}>
        {root ? (
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text fw={700} size="sm" truncate>
              {category.name}
            </Text>
            <Badge variant="outline" size="sm" color="gray">
              {displayCategoryKind(category.categoryKind)}
            </Badge>
          </Group>
        ) : (
          <span className="budget-matrix-child">{category.name}</span>
        )}
      </th>
      {months.map((month) => {
        const data = monthData.get(yearMonthKey(month));
        return (
          <MatrixDataCell
            key={yearMonthKey(month)}
            category={category}
            month={month}
            nowYm={nowYm}
            valueMode={valueMode}
            budget={data?.budgets.get(category.id)}
            actual={data?.actuals.get(category.id)}
            applyToFutureMonths={applyToFutureMonths}
            isRefreshing={isRefreshing}
          />
        );
      })}
    </tr>
  );
}
