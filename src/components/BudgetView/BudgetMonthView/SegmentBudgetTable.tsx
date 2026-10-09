import {
  Badge,
  Box,
  Group,
  Paper,
  Table,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import type { MouseEvent } from "react";
import type { Category } from "../../../models";
import { useSetBudget } from "../../../hooks/useBudgets.js";
import type { CategorySegment } from "../../Category/CategoriesView/categorySegments.js";
import { displayCategoryKind } from "../../Category/CategoriesView/categoryDisplay.js";
import type { YearMonth } from "../../../utils/monthRange.js";
import { BudgetCellInput } from "../shared/BudgetCellInput.js";
import {
  ActualCell,
  CategoryNameButton,
  DifferenceCell,
} from "./SegmentTableCells.js";

type SegmentBudgetTableProps = {
  segment: CategorySegment;
  selectedMonth: YearMonth;
  budgetByCategoryId: Map<string, string>;
  actualByCategoryId: Map<string, number>;
  /** When true, SetBudget also overwrites following months. Default false. */
  overwriteFutureMonths?: boolean;
  onOpenCategory?: (category: Category) => void;
};

const stopRowClick = (event: MouseEvent) => event.stopPropagation();

export function SegmentBudgetTable({
  segment,
  selectedMonth,
  budgetByCategoryId,
  actualByCategoryId,
  overwriteFutureMonths = false,
  onOpenCategory,
}: SegmentBudgetTableProps) {
  const setBudget = useSetBudget();
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  const rootStripColor =
    colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0];

  const root = segment.root;
  const rootActual = actualByCategoryId.get(root.id);
  const rootBudget = budgetByCategoryId.get(root.id);
  const rootEditable = !root.isParent;

  const commitAmount = (categoryId: string, amount: string) =>
    setBudget.mutateAsync({
      categoryId,
      year: selectedMonth.year,
      month: selectedMonth.month,
      amount,
      overwriteFutureMonths,
    });

  const canOpen = (category: Category) =>
    onOpenCategory !== undefined && !category.isParent;

  const openRowProps = (category: Category) =>
    canOpen(category)
      ? {
          onClick: () => onOpenCategory?.(category),
          style: { cursor: "pointer" },
        }
      : {};

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
            <Table.Th style={{ width: "28%" }}>Name</Table.Th>
            <Table.Th style={{ width: "24%", textAlign: "right" }}>
              Budgeted
            </Table.Th>
            <Table.Th style={{ width: "24%", textAlign: "right" }}>
              Actual
            </Table.Th>
            <Table.Th style={{ width: "24%", textAlign: "right" }}>
              Difference
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr
            {...openRowProps(root)}
            style={{
              ...openRowProps(root).style,
              backgroundColor: rootStripColor,
            }}
          >
            <Table.Td style={{ verticalAlign: "middle" }}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text fw={700} size="sm" style={{ minWidth: 0 }}>
                  {canOpen(root) ? (
                    <CategoryNameButton name={root.name} />
                  ) : (
                    root.name
                  )}
                </Text>
                <Badge
                  variant="outline"
                  size="sm"
                  color="gray"
                  style={{ flexShrink: 0 }}
                >
                  {displayCategoryKind(root.categoryKind)}
                </Badge>
              </Group>
            </Table.Td>
            <Table.Td
              style={{ textAlign: "right", verticalAlign: "middle" }}
              onClick={stopRowClick}
            >
              {rootEditable ? (
                <BudgetCellInput
                  amountStr={rootBudget}
                  onCommit={(amount) => commitAmount(root.id, amount)}
                  saving={isSavingCell(root.id)}
                  fw={600}
                />
              ) : (
                <Text span c="dimmed" size="sm">
                  —
                </Text>
              )}
            </Table.Td>
            <Table.Td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <ActualCell value={rootActual} />
            </Table.Td>
            <Table.Td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <DifferenceCell
                categoryKind={root.categoryKind}
                budgetRaw={rootBudget}
                actual={rootActual}
              />
            </Table.Td>
          </Table.Tr>
          {segment.children.map((row) => {
            const budgetRaw = budgetByCategoryId.get(row.id);
            const actualNum = actualByCategoryId.get(row.id);

            return (
              <Table.Tr key={row.id} {...openRowProps(row)}>
                <Table.Td style={{ verticalAlign: "middle" }}>
                  <Box
                    style={{
                      paddingLeft: 24,
                      borderLeft: "2px solid var(--mantine-color-brand-3)",
                    }}
                  >
                    {canOpen(row) ? (
                      <CategoryNameButton name={row.name} />
                    ) : (
                      row.name
                    )}
                  </Box>
                </Table.Td>
                <Table.Td
                  style={{ textAlign: "right", verticalAlign: "middle" }}
                  onClick={stopRowClick}
                >
                  <BudgetCellInput
                    amountStr={budgetRaw}
                    onCommit={(amount) => commitAmount(row.id, amount)}
                    saving={isSavingCell(row.id)}
                  />
                </Table.Td>
                <Table.Td
                  style={{ textAlign: "right", verticalAlign: "middle" }}
                >
                  <ActualCell value={actualNum} />
                </Table.Td>
                <Table.Td
                  style={{ textAlign: "right", verticalAlign: "middle" }}
                >
                  <DifferenceCell
                    categoryKind={row.categoryKind}
                    budgetRaw={budgetRaw}
                    actual={actualNum}
                  />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
