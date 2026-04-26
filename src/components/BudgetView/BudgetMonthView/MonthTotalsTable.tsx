import { Paper, Box, Table, Text } from "@mantine/core";
import { formatCurrency } from "../../../utils/format";
import { rollUpBudgetByType } from "../budgetRollups";

type MonthSummary = ReturnType<typeof rollUpBudgetByType>;

const headerStripStyle = {
  backgroundColor: "var(--mantine-color-gray-0)",
  borderBottom: "1px solid var(--mantine-color-default-border)",
} as const;

type MonthTotalsTableProps = {
  monthSummary: MonthSummary;
};

export function MonthTotalsTable({
  monthSummary,
}: MonthTotalsTableProps) {
  return (
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
  );
}
