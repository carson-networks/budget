import { Box, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { useState } from "react";
import { BudgetCellInput } from "../components/BudgetView/shared/BudgetCellInput.js";

/**
 * Spike-only harness for demo capture: mid-page and near-top cells without API.
 */
export function SpikeFollowMonthsConfirmPage() {
  const [nearTop, setNearTop] = useState("120");
  const [midPage, setMidPage] = useState("400");
  const [lastCommit, setLastCommit] = useState<string>("(none yet)");

  return (
    <Box p="md" maw={640} mx="auto">
      <Title order={3} mb="xs">
        Spike: follow-months confirm
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Edit a Budgeted cell, then blur. Confirm floats above when space
        allows; near the top it flips below. Default answer is No.
      </Text>
      <Text size="sm" mb="lg">
        Last commit: {lastCommit}
      </Text>

      <Paper withBorder radius="md" mb="xl" style={{ overflow: "hidden" }}>
        <Table withTableBorder withColumnBorders fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th style={{ textAlign: "right", width: "30%" }}>
                Budgeted
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Near top (flip below)</Table.Td>
              <Table.Td>
                <BudgetCellInput
                  amountStr={nearTop}
                  onCommit={(amount, overwriteFutureMonths) => {
                    setNearTop(amount);
                    setLastCommit(
                      `near-top → $${amount}, following=${overwriteFutureMonths}`,
                    );
                  }}
                />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      <Box h={420} />

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <Table withTableBorder withColumnBorders fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th style={{ textAlign: "right", width: "30%" }}>
                Budgeted
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Mid page (float above)</Table.Td>
              <Table.Td>
                <BudgetCellInput
                  amountStr={midPage}
                  onCommit={(amount, overwriteFutureMonths) => {
                    setMidPage(amount);
                    setLastCommit(
                      `mid-page → $${amount}, following=${overwriteFutureMonths}`,
                    );
                  }}
                />
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      <Stack h={200} />
    </Box>
  );
}
