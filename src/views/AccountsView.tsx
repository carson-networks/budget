import { useState, useMemo } from "react";
import {
  Box,
  Loader,
  Alert,
  Table,
  Affix,
  ActionIcon,
  Paper,
  Title,
  Text,
} from "@mantine/core";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import { useAllAccounts, AccountType, type Account } from "../hooks/useAccounts";
import { groupAccountsByType } from "../utils/accountSegments";
import { accountSyncTypeLabel } from "../utils/accountSyncDisplay";
import CreateAccountModal from "../components/CreateAccountModal";
import EditAccountModal from "../components/EditAccountModal";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.UNSPECIFIED]: "Unspecified",
  [AccountType.CASH]: "Cash",
  [AccountType.CREDIT_CARDS]: "Credit Cards",
};

function formatCurrency(value: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(value));
}

type AccountsTableProps = {
  accounts: Account[];
  onRowSettings: (account: Account) => void;
};

function AccountsSubTable({ accounts, onRowSettings }: AccountsTableProps) {
  return (
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
          <Table.Th style={{ width: 48 }} />
          <Table.Th>Name</Table.Th>
          <Table.Th style={{ width: 100 }}>Integration</Table.Th>
          <Table.Th style={{ width: 140 }}>Sub Type</Table.Th>
          <Table.Th style={{ width: 130 }}>Balance</Table.Th>
          <Table.Th style={{ width: 140 }}>Starting Balance</Table.Th>
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
            <Table.Td style={{ verticalAlign: "middle" }}>{row.name}</Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>
              {accountSyncTypeLabel(row)}
            </Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>{row.subType}</Table.Td>
            <Table.Td fw={500} style={{ verticalAlign: "middle" }}>
              {formatCurrency(row.balance)}
            </Table.Td>
            <Table.Td style={{ verticalAlign: "middle" }}>
              {formatCurrency(row.startingBalance)}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function AccountsView() {
  const { accounts, isLoading, error } = useAllAccounts();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsAccount, setSettingsAccount] = useState<Account | null>(null);

  const segments = useMemo(() => groupAccountsByType(accounts), [accounts]);

  if (isLoading) {
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

  if (error) {
    return (
      <Box style={{ flex: 1, padding: 16 }}>
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Title order={4} mb="md" c="dark.6">
        Accounts
      </Title>

      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
        {accounts.length === 0 ? (
          <Text size="sm" c="dimmed">
            No accounts yet. Use the + button to add one.
          </Text>
        ) : null}
        {segments.map((segment) => (
          <Paper
            key={segment.type}
            shadow="sm"
            radius="md"
            mb="md"
            p={0}
            withBorder
            style={{ overflow: "hidden" }}
          >
            <Box
              px="md"
              py="sm"
              style={{
                backgroundColor: "var(--mantine-color-gray-0)",
                borderBottom: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Text fw={700} size="sm">
                {ACCOUNT_TYPE_LABELS[segment.type] ?? String(segment.type)}
              </Text>
            </Box>

            <AccountsSubTable
              accounts={segment.accounts}
              onRowSettings={setSettingsAccount}
            />
          </Paper>
        ))}
      </Box>

      <Affix position={{ bottom: 24, right: 24 }}>
        <ActionIcon
          size="xl"
          radius="xl"
          color="brand"
          aria-label="add account"
          onClick={() => setCreateModalOpen(true)}
        >
          <IconPlus size={24} />
        </ActionIcon>
      </Affix>

      <CreateAccountModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <EditAccountModal
        account={settingsAccount}
        opened={settingsAccount !== null}
        onClose={() => setSettingsAccount(null)}
      />
    </Box>
  );
}
