import { Paper, Box, Table, Group, Text, Badge } from "@mantine/core";
import { useSetBudget } from "../../../hooks/useBudgets";
import type { CategorySegment } from "../../../utils/categorySegments";
import type { YearMonth } from "../../../utils/monthRange";
import { BudgetCellInput } from "../shared/BudgetCellInput.tsx";
import { formatCurrency } from "../../../utils/format";
import { displayCategoryType } from "../../shared/CategoryDisplay";

const headerStripStyle = {
  backgroundColor: "var(--mantine-color-gray-0)",
  borderBottom: "1px solid var(--mantine-color-default-border)",
} as const;

type SegmentBudgetTableProps = {
  segment: CategorySegment;
  selectedMonth: YearMonth;
  budgetByCategoryId: Map<string, string>;
  actualByCategoryId: Map<string, number>;
};

export function SegmentBudgetTable({
  segment,
  selectedMonth,
  budgetByCategoryId,
  actualByCategoryId,
}: SegmentBudgetTableProps) {
  const setBudget = useSetBudget();
  const root = segment.root;
  const rootActual = actualByCategoryId.get(root.id);
  const rootBudget = budgetByCategoryId.get(root.id);

  const commitAmount = (categoryId: string, amount: string) =>
    setBudget.mutateAsync({
      categoryId,
      year: selectedMonth.year,
      month: selectedMonth.month,
      amount,
      overwriteFutureMonths: false,
    });

  const isSavingCell = (categoryId: string) =>
    setBudget.isPending &&
    setBudget.variables?.categoryId === categoryId &&
    setBudget.variables?.year === selectedMonth.year &&
    setBudget.variables?.month === selectedMonth.month;

  return (
    <Paper
      shadow="sm"
      radius="md"
      mb="md"
      p={0}
      withBorder
      style={{ overflow: "hidden" }}
    >
      <Table
        highlightOnHover
        withTableBorder
        withColumnBorders
        verticalSpacing="xs"
        horizontalSpacing="xs"
        fz="sm"
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: "52%" }}>Name</Table.Th>
            <Table.Th style={{ width: "24%", textAlign: "right" }}>
              Budgeted
            </Table.Th>
            <Table.Th style={{ width: "24%", textAlign: "right" }}>
              Actual
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr style={{ backgroundColor: headerStripStyle.backgroundColor }}>
            <Table.Td style={{ verticalAlign: "middle" }}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text fw={700} size="sm" style={{ minWidth: 0 }}>
                  {root.name}
                </Text>
                <Badge
                  variant="outline"
                  size="sm"
                  color="gray"
                  style={{ flexShrink: 0 }}
                >
                  {displayCategoryType(root.categoryType)}
                </Badge>
              </Group>
            </Table.Td>
            <Table.Td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <BudgetCellInput
                amountStr={rootBudget}
                onCommit={(amount) => commitAmount(root.id, amount)}
                saving={isSavingCell(root.id)}
                fw={600}
              />
            </Table.Td>
            <Table.Td style={{ textAlign: "right", verticalAlign: "middle" }}>
              {rootActual !== undefined ? (
                formatCurrency(rootActual)
              ) : (
                <Text span c="dimmed" size="sm">
                  —
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
          {segment.descendantRows.map(({ category: row, depth }) => {
            const budgetRaw = budgetByCategoryId.get(row.id);
            const actualNum = actualByCategoryId.get(row.id);

            return (
              <Table.Tr key={row.id}>
                <Table.Td style={{ verticalAlign: "middle" }}>
                  <Box
                    style={{
                      paddingLeft: depth * 24,
                      borderLeft:
                        depth > 0
                          ? "2px solid var(--mantine-color-brand-3)"
                          : undefined,
                    }}
                  >
                    {row.name}
                  </Box>
                </Table.Td>
                <Table.Td style={{ textAlign: "right", verticalAlign: "middle" }}>
                  <BudgetCellInput
                    amountStr={budgetRaw}
                    onCommit={(amount) => commitAmount(row.id, amount)}
                    saving={isSavingCell(row.id)}
                  />
                </Table.Td>
                <Table.Td style={{ textAlign: "right", verticalAlign: "middle" }}>
                  {actualNum !== undefined ? (
                    formatCurrency(actualNum)
                  ) : (
                    <Text span c="dimmed" size="sm">
                      —
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
