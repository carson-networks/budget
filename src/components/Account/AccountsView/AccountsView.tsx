import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { AccountKind } from "../../../models";
import { useAllAccounts } from "../../../hooks/useAccounts.js";
import { useConnectedAccountFlow } from "../../../plaid/useConnectedAccountFlow.js";
import { prefetchPlaidLinkToken } from "../../../plaid/usePlaidLinkToken.js";
import CreateManualAccountModal from "../CreateManualAccountModal/Modal.js";
import { SectionCard } from "../../shared/SectionCard.js";
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
  const queryClient = useQueryClient();
  const { accounts, isLoading, error } = useAllAccounts();
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const {
    startLink,
    tokenError,
    exchangeError,
    dismissTokenError,
    dismissExchangeError,
  } = useConnectedAccountFlow(() => navigate("/accounts"));

  const segments = useMemo(() => groupAccountsByKind(accounts), [accounts]);

  if (isLoading) {
    return (
      <Stack align="center" justify="center" gap="sm" py="xl">
        <Loader size="md" />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Something went wrong">
        {error.message}
      </Alert>
    );
  }

  return (
    <ViewShell title="Accounts">
      <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
        {tokenError ? (
          <Alert
            color="red"
            title="Could not start Plaid"
            onClose={dismissTokenError}
            withCloseButton
          >
            {tokenError}
          </Alert>
        ) : null}

        {exchangeError ? (
          <Alert
            color="red"
            title="Could not link accounts"
            onClose={dismissExchangeError}
            withCloseButton
          >
            {exchangeError}
          </Alert>
        ) : null}

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
      </Stack>

      <AddAccountMenu
        onManualOpen={() => setManualModalOpen(true)}
        onAddAccountMenuOpen={() => prefetchPlaidLinkToken(queryClient)}
        onConnectBankOpen={() => void startLink()}
      />

      <CreateManualAccountModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />
    </ViewShell>
  );
}
