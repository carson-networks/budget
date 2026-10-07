import { Badge, Group, Table, Text } from "@mantine/core";
import { useSetBudget } from "../../../hooks/useBudgets.js";
import type { CategorySegment } from "../../Category/CategoriesView/categorySegments.js";
import { displayCategoryKind } from "../../Category/CategoriesView/categoryDisplay.js";
import {
  compareYearMonth,
  formatYearMonthLabel,
  yearMonthKey,
  type YearMonth,
} from "../../../utils/monthRange.js";
import { BudgetCellInput } from "../shared/BudgetCellInput.js";
import {
  CATEGORY_COLUMN_PX,
  MONTH_COLUMN_PX,
  MatrixValueMode,
  formatMatrixValue,
  matrixCellNumber,
  totalForMode,
} from "./budgetMatrix.js";
import type { MatrixMonthData } from "./buildBudgetMatrixData.js";

type Props = {
  segments: CategorySegment[];
  months: YearMonth[];
  nowYm: YearMonth;
  monthData: Map<string, MatrixMonthData>;
  valueMode: MatrixValueMode;
  applyToFutureMonths: boolean;
  isRefreshing: boolean;
};

export function MatrixTable({
  segments,
  months,
  nowYm,
  monthData,
  valueMode,
  applyToFutureMonths,
  isRefreshing,
}: Props) {
  const setBudget = useSetBudget();
  const rows = segments.flatMap((segment) => [
    { category: segment.root, root: true },
    ...segment.children.map((category) => ({ category, root: false })),
  ]);
  const monthAttributes = (month: YearMonth) => ({
    "data-current": compareYearMonth(month, nowYm) === 0 || undefined,
    "data-year-start": month.month === 1 || undefined,
  });
  return (
    <Table
      aria-label="Budget matrix"
      aria-busy={isRefreshing}
      className="budget-matrix"
      w={CATEGORY_COLUMN_PX + months.length * MONTH_COLUMN_PX}
      layout="fixed"
      withColumnBorders
      stickyHeader
      tabularNums
    >
      <colgroup>
        <col style={{ width: CATEGORY_COLUMN_PX }} />
        {months.map((month) => (
          <col key={yearMonthKey(month)} style={{ width: MONTH_COLUMN_PX }} />
        ))}
      </colgroup>
      <Table.Thead>
        <Table.Tr>
          <Table.Th scope="col">Category</Table.Th>
          {months.map((month) => (
            <Table.Th
              scope="col"
              key={yearMonthKey(month)}
              {...monthAttributes(month)}
            >
              {formatYearMonthLabel(month)}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map(({ category, root }) => (
          <Table.Tr key={category.id} data-root={root || undefined}>
            <Table.Th scope="row" title={category.name}>
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
                <Text span pl="lg" size="sm" fw={400}>
                  {category.name}
                </Text>
              )}
            </Table.Th>
            {months.map((month) => {
              const data = monthData.get(yearMonthKey(month));
              const budget = data?.budgets.get(category.id);
              const value = matrixCellNumber(
                valueMode,
                category.categoryKind,
                budget,
                data?.actuals.get(category.id),
              );
              const saving =
                setBudget.isPending &&
                setBudget.variables?.categoryId === category.id &&
                setBudget.variables?.year === month.year &&
                setBudget.variables?.month === month.month;
              return (
                <Table.Td key={yearMonthKey(month)} {...monthAttributes(month)}>
                  {valueMode === MatrixValueMode.Budgeted &&
                  !category.isParent ? (
                    <BudgetCellInput
                      label={`${category.name} budget for ${formatYearMonthLabel(month)}`}
                      amountStr={budget}
                      saving={saving}
                      disabled={isRefreshing}
                      onCommit={(amount) =>
                        setBudget.mutateAsync({
                          categoryId: category.id,
                          ...month,
                          amount,
                          overwriteFutureMonths: applyToFutureMonths,
                        })
                      }
                    />
                  ) : value === undefined ||
                    (valueMode === MatrixValueMode.Budgeted &&
                      category.isParent) ? (
                    <Text span c="dimmed" size="sm">
                      —
                    </Text>
                  ) : (
                    formatMatrixValue(value)
                  )}
                </Table.Td>
              );
            })}
          </Table.Tr>
        ))}
      </Table.Tbody>
      <Table.Tfoot>
        <Table.Tr>
          <Table.Th scope="row">Total</Table.Th>
          {months.map((month) => {
            const summary = monthData.get(yearMonthKey(month))?.summary;
            return (
              <Table.Td key={yearMonthKey(month)} {...monthAttributes(month)}>
                {summary
                  ? formatMatrixValue(totalForMode(summary, valueMode))
                  : "—"}
              </Table.Td>
            );
          })}
        </Table.Tr>
      </Table.Tfoot>
    </Table>
  );
}
