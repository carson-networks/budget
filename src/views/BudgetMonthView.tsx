import { useMemo, useState } from "react";
import {
  Box,
  Loader,
  Alert,
  Paper,
  Table,
  Group,
  Text,
  ActionIcon,
  Badge,
  Button,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useAllCategories, CategoryType } from "../hooks/useCategories";
import { useBudgetsForRange } from "../hooks/useBudgets";
import { useAllTransactions } from "../hooks/useTransactions";
import { rollUpBudgetByType } from "../utils/budgetRollups";
import {
  buildCategorySegments,
  sortCategorySegmentsForDisplay,
} from "../utils/categorySegments";
import {
  addMonths,
  currentYearMonth,
  formatYearMonthLabel,
  type YearMonth,
} from "../utils/monthRange";
import { transactionYearMonth } from "../utils/transactionMonthBuckets";
import { BudgetCellInput } from "../components/BudgetCellInput";

function displayCategoryType(type: CategoryType): string {
  return type === CategoryType.INCOME ? "Income" : "Expense";
}

function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return typeof value === "string" ? value : "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function BudgetMonthView() {
  const [selectedMonth, setSelectedMonth] = useState<YearMonth>(() =>
    currentYearMonth(),
  );

  const { categories, isLoading: categoriesLoading } = useAllCategories();
  const { transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: budgetsResponse, error: budgetsError } = useBudgetsForRange(
    selectedMonth,
    selectedMonth,
  );

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.isDisabled),
    [categories],
  );

  const segments = useMemo(
    () =>
      sortCategorySegmentsForDisplay(buildCategorySegments(visibleCategories)),
    [visibleCategories],
  );

  const budgetByCategoryId = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of budgetsResponse?.budgets ?? []) {
      if (b.year === selectedMonth.year && b.month === selectedMonth.month) {
        m.set(b.categoryId, b.amount);
      }
    }
    return m;
  }, [budgetsResponse, selectedMonth]);

  const actualByCategoryId = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      const ym = transactionYearMonth(t);
      if (
        !ym ||
        ym.year !== selectedMonth.year ||
        ym.month !== selectedMonth.month
      ) {
        continue;
      }
      const cid = t.categoryId;
      if (!cid) continue;
      const amt = parseFloat(t.amount);
      if (Number.isNaN(amt)) continue;
      m.set(cid, (m.get(cid) ?? 0) + amt);
    }
    return m;
  }, [transactions, selectedMonth]);

  const monthSummary = useMemo(
    () =>
      rollUpBudgetByType(
        visibleCategories,
        (id) => {
          const raw = budgetByCategoryId.get(id);
          if (raw === undefined) return undefined;
          const n = parseFloat(raw);
          return Number.isNaN(n) ? undefined : n;
        },
        (id) => actualByCategoryId.get(id),
      ),
    [visibleCategories, budgetByCategoryId, actualByCategoryId],
  );

  const isLoading = categoriesLoading || transactionsLoading;
  const budgetsReady = !!budgetsResponse;
  const showFullLoader = isLoading || (!budgetsReady && !budgetsError);

  if (showFullLoader) {
    return (
      <Box
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader color="brand" />
      </Box>
    );
  }

  if (budgetsError) {
    return (
      <Box style={{ flex: 1, padding: 16 }}>
        <Alert color="red" title="Error">
          {budgetsError.message}
        </Alert>
      </Box>
    );
  }

  const headerStripStyle = {
    backgroundColor: "var(--mantine-color-gray-0)",
    borderBottom: "1px solid var(--mantine-color-default-border)",
  } as const;

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          paddingRight: 2,
        }}
      >
        <Paper
          shadow="sm"
          radius="md"
          mb="md"
          p={0}
          withBorder
          style={{ overflow: "hidden" }}
        >
          <Box px="md" py="sm" style={headerStripStyle}>
            <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
              <Box style={{ flex: 1 }} />
              <Group gap="md" wrap="nowrap" justify="center">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Previous month"
                  onClick={() => setSelectedMonth((m) => addMonths(m, -1))}
                >
                  <IconChevronLeft size={20} />
                </ActionIcon>
                <Text
                  fw={700}
                  size="sm"
                  c="brand.7"
                  style={{ minWidth: 160, textAlign: "center" }}
                >
                  {formatYearMonthLabel(selectedMonth)}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Next month"
                  onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
                >
                  <IconChevronRight size={20} />
                </ActionIcon>
              </Group>
              <Box
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="light"
                  color="brand"
                  size="sm"
                  onClick={() => setSelectedMonth(currentYearMonth())}
                >
                  Today
                </Button>
              </Box>
            </Group>
          </Box>
        </Paper>

        {segments.map((segment) => {
          const root = segment.root;
          const rootActual = actualByCategoryId.get(root.id);
          const rootBudget = budgetByCategoryId.get(root.id);
          return (
            <Paper
              key={segment.root.id}
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
                    <Table.Td
                      style={{ textAlign: "right", verticalAlign: "middle" }}
                    >
                      <BudgetCellInput
                        categoryId={root.id}
                        year={selectedMonth.year}
                        month={selectedMonth.month}
                        amountStr={rootBudget}
                        overwriteFutureMonths={false}
                        fw={600}
                      />
                    </Table.Td>
                    <Table.Td
                      style={{ textAlign: "right", verticalAlign: "middle" }}
                    >
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
                        <Table.Td
                          style={{ textAlign: "right", verticalAlign: "middle" }}
                        >
                          <BudgetCellInput
                            categoryId={row.id}
                            year={selectedMonth.year}
                            month={selectedMonth.month}
                            amountStr={budgetRaw}
                            overwriteFutureMonths={false}
                          />
                        </Table.Td>
                        <Table.Td
                          style={{ textAlign: "right", verticalAlign: "middle" }}
                        >
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
        })}

        <Paper
          shadow="sm"
          radius="md"
          mb="md"
          p={0}
          withBorder
          style={{ overflow: "hidden" }}
        >
          <Box px="md" py="sm" style={headerStripStyle}>
            <Text fw={700} size="sm">
              Month totals
            </Text>
          </Box>
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
                <Table.Th style={{ width: "28%" }} />
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
              <Table.Tr>
                <Table.Td fw={700}>Income</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {formatCurrency(monthSummary.income.budget)}
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {formatCurrency(monthSummary.income.actual)}
                </Table.Td>
                <Table.Td style={{ textAlign: "right", fontWeight: 600 }}>
                  {formatCurrency(monthSummary.income.difference)}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={700}>Expenses</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {formatCurrency(monthSummary.expense.budget)}
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {formatCurrency(monthSummary.expense.actual)}
                </Table.Td>
                <Table.Td style={{ textAlign: "right", fontWeight: 600 }}>
                  {formatCurrency(monthSummary.expense.difference)}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={700}>Net</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {formatCurrency(monthSummary.net.budget)}
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {formatCurrency(monthSummary.net.actual)}
                </Table.Td>
                <Table.Td style={{ textAlign: "right", fontWeight: 600 }}>
                  {formatCurrency(monthSummary.net.difference)}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
}
