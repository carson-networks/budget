import { useMemo } from "react";
import { Box, Text } from "@mantine/core";
import { useAllAccounts, AccountType, type Account } from "../../hooks/useAccounts";
import { useEntityModals } from "../../hooks/useEntityModals";
import { groupAccountsByType } from "./accountTypes";
import CreateAccountModal from "../CreateAccountModal/Modal";
import EditAccountModal from "../EditAccountModal/Modal";
import { AccountTable } from "./AccountTable.tsx";
import { FloatingCreateButton } from "../shared/FloatingCreateButton";
import { SectionCard } from "../shared/SectionCard";
import { ViewErrorAlert } from "../shared/ViewErrorAlert";
import { ViewLoadingState } from "../shared/ViewLoadingState";
import { ViewShell } from "../shared/ViewShell";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.UNSPECIFIED]: "Unspecified",
  [AccountType.CASH]: "Cash",
  [AccountType.CREDIT_CARDS]: "Credit Cards",
};

export default function AccountsView() {
  const { accounts, isLoading, error } = useAllAccounts();
  const {
    createOpen,
    closeCreate,
    openCreate,
    editing: settingsAccount,
    setEditing: setSettingsAccount,
  } = useEntityModals<Account>();

  const segments = useMemo(() => groupAccountsByType(accounts), [accounts]);

  if (isLoading) {
    return <ViewLoadingState />;
  }

  if (error) {
    return <ViewErrorAlert message={error.message} />;
  }

  return (
    <ViewShell title="Accounts">
      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 2 }}>
        {accounts.length === 0 ? (
          <Text size="sm" c="dimmed">
            No accounts yet. Use the + button to add one.
          </Text>
        ) : null}
        {segments.map((segment) => (
          <SectionCard
            key={segment.type}
            header={
              <Text fw={700} size="sm">
                {ACCOUNT_TYPE_LABELS[segment.type] ?? String(segment.type)}
              </Text>
            }
          >
            <AccountTable
              accounts={segment.accounts}
              onRowSettings={setSettingsAccount}
            />
          </SectionCard>
        ))}
      </Box>

      <FloatingCreateButton ariaLabel="Add account" onClick={openCreate} />

      <CreateAccountModal open={createOpen} onClose={closeCreate} />

      <EditAccountModal
        account={settingsAccount}
        opened={settingsAccount !== null}
        onClose={() => setSettingsAccount(null)}
      />
    </ViewShell>
  );
}
