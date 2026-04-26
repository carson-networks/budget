import { Box, ActionIcon, Table, rem } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { type Account } from "../../hooks/useAccounts";
import { accountSyncTypeLabel } from "./accountSyncTypes";
import { formatCurrency } from "../../utils/format";
import { EntityTable } from "../shared/EntityTable";

type SubTableProps = {
  accounts: Account[];
  onRowSettings: (account: Account) => void;
};

const COLUMN_WIDTHS = {
  settings: rem(48),
  name: undefined,
  integration: rem(100),
  subType: rem(140),
  balance: rem(165),
  startingBalance: rem(165),
} as const;

export function AccountTable({ accounts, onRowSettings }: SubTableProps) {
  return (
    <Table.ScrollContainer minWidth={rem(700)}>
      <EntityTable style={{ tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: COLUMN_WIDTHS.settings }} />
          <col style={{ width: COLUMN_WIDTHS.name }} />
          <col style={{ width: COLUMN_WIDTHS.integration }} />
          <col style={{ width: COLUMN_WIDTHS.subType }} />
          <col style={{ width: COLUMN_WIDTHS.balance }} />
          <col style={{ width: COLUMN_WIDTHS.startingBalance }} />
        </colgroup>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th>Name</Table.Th>
            <Table.Th>Integration</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Balance</Table.Th>
            <Table.Th>Starting Balance</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {accounts.map((row) => (
            <Table.Tr key={row.id}>
              <Table.Td
                style={{ verticalAlign: "middle", textAlign: "center" }}
              >
                <Box
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    aria-label={`Settings for ${row.name}`}
                    onClick={() => onRowSettings(row)}
                  >
                    <IconSettings size={18} />
                  </ActionIcon>
                </Box>
              </Table.Td>
              <Table.Td style={{ verticalAlign: "middle" }}> {row.name} </Table.Td>
              <Table.Td style={{ verticalAlign: "middle" }}> {accountSyncTypeLabel(row)} </Table.Td>
              <Table.Td style={{ verticalAlign: "middle" }}> {row.subType} </Table.Td>
              <Table.Td fw={500} style={{ verticalAlign: "middle" }}> {formatCurrency(row.balance)} </Table.Td>
              <Table.Td style={{ verticalAlign: "middle" }}> {formatCurrency(row.startingBalance)} </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </EntityTable>
    </Table.ScrollContainer>
  );
}
