import { Table, Text } from "@mantine/core";
import { formatCurrency } from "../../../models";
import { SectionCard } from "../../shared/SectionCard.js";
import type { BudgetRollupSummary } from "../budgetRollups.js";

type MonthTotalsTableProps = {
  monthSummary: BudgetRollupSummary;
};

function formatAmount(n: number): string {
  return formatCurrency(n.toFixed(2));
}

export function MonthTotalsTable({ monthSummary }: MonthTotalsTableProps) {
  return (
    <SectionCard header={<Text fw={700} size="sm">Month totals</Text>}>
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
              {formatAmount(monthSummary.income.budget)}
            </Table.Td>
            <Table.Td style={{ textAlign: "right" }}>
              {formatAmount(monthSummary.income.actual)}
            </Table.Td>
            <Table.Td style={{ textAlign: "right", fontWeight: 600 }}>
              {formatAmount(monthSummary.income.difference)}
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={700}>Expenses</Table.Td>
            <Table.Td style={{ textAlign: "right" }}>
              {formatAmount(monthSummary.expense.budget)}
            </Table.Td>
            <Table.Td style={{ textAlign: "right" }}>
              {formatAmount(monthSummary.expense.actual)}
            </Table.Td>
            <Table.Td style={{ textAlign: "right", fontWeight: 600 }}>
              {formatAmount(monthSummary.expense.difference)}
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={700}>Net</Table.Td>
            <Table.Td style={{ textAlign: "right" }}>
              {formatAmount(monthSummary.net.budget)}
            </Table.Td>
            <Table.Td style={{ textAlign: "right" }}>
              {formatAmount(monthSummary.net.actual)}
            </Table.Td>
            <Table.Td style={{ textAlign: "right", fontWeight: 600 }}>
              {formatAmount(monthSummary.net.difference)}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </SectionCard>
  );
}
