import { useMemo, useState } from "react";
import { Box, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { AccountKind } from "../../../models";
import { useAllAccounts } from "../../../hooks/useAccounts.js";
import CreateManualAccountModal from "../CreateManualAccountModal/Modal.js";
import CreateConnectedAccountModal from "../CreateConnectedAccountModal/Modal.js";
import { SectionCard } from "../../shared/SectionCard.js";
import { ViewErrorAlert } from "../../shared/ViewErrorAlert.js";
import { ViewLoadingState } from "../../shared/ViewLoadingState.js";
import { ViewShell } from "../../shared/ViewShell.js";
import { AccountTable } from "./AccountTable.js";
import { AddAccountMenu } from "./AddAccountMenu.js";
import { groupAccountsByKind } from "./accountSegments.js";

const KIND_LABELS: Record<AccountKind, string> = {
  [AccountKind.Unspecified]: "Unspecified",
  [AccountKind.Cash]: "Cash",
  [AccountKind.CreditCards]: "Credit Cards",
};

export default function AccountsView() {
  const navigate = useNavigate();
  const { accounts, isLoading, error } = useAllAccounts();
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [connectedModalOpen, setConnectedModalOpen] = useState(false);

  const segments = useMemo(() => groupAccountsByKind(accounts), [accounts]);

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
            key={segment.kind}
            header={
              <Text fw={700} size="sm">
                {KIND_LABELS[segment.kind] ?? String(segment.kind)}
              </Text>
            }
          >
            <AccountTable
              accounts={segment.accounts}
              onRowNavigate={(a) => navigate(`/accounts/${a.id}`)}
              onOpenEdit={() => {
                /* EditAccountModal wired in a later phase */
              }}
            />
          </SectionCard>
        ))}
      </Box>

      <AddAccountMenu
        onManualOpen={() => setManualModalOpen(true)}
        onConnectBankOpen={() => setConnectedModalOpen(true)}
      />

      <CreateManualAccountModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />

      <CreateConnectedAccountModal
        open={connectedModalOpen}
        onClose={() => setConnectedModalOpen(false)}
      />
    </ViewShell>
  );
}
