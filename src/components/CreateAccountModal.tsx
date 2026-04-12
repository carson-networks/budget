import { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  Box,
  Stack,
  TextInput,
  Select,
  Button,
  Alert,
  Loader,
  Title,
  Text,
} from "@mantine/core";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import {
  useCreateAccount,
  AccountType,
  type CreateAccountInput,
} from "../hooks/useAccounts";
import {
  ACCOUNT_SYNC_OPTIONS,
  PLAID_ACCOUNT_SUB_TYPE,
  type AccountSyncProviderId,
} from "../constants/accountSyncIntegrations";
import { PlaidConnectButton } from "./PlaidConnectButton";

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES = [
  { value: String(AccountType.CASH), label: "Cash" },
  { value: String(AccountType.CREDIT_CARDS), label: "Credit Cards" },
];

const SYNC_SELECT_DATA = ACCOUNT_SYNC_OPTIONS.map((o) => ({
  value: o.id,
  label: o.available ? o.label : `${o.label} (coming soon)`,
  disabled: !o.available,
}));

function buildPlaidAccountBody(
  nameInput: string,
  metadata: PlaidLinkOnSuccessMetadata,
): CreateAccountInput {
  const resolvedName =
    nameInput.trim() ||
    metadata.accounts[0]?.name ||
    metadata.institution?.name ||
    "Linked account";
  return {
    name: resolvedName,
    type: AccountType.CASH,
    subType: PLAID_ACCOUNT_SUB_TYPE,
    startingBalance: "0",
    sync: { provider: "plaid", plaidLinkCompleted: true },
  };
}

export default function CreateAccountModal({ open, onClose }: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(String(AccountType.CASH));
  const [subType, setSubType] = useState("");
  const [startingBalance, setStartingBalance] = useState("");
  const [syncProvider, setSyncProvider] = useState<AccountSyncProviderId>("manual");
  const [plaidLinkCompleted, setPlaidLinkCompleted] = useState(false);
  const lastPlaidMetadataRef = useRef<PlaidLinkOnSuccessMetadata | null>(null);

  const createAccount = useCreateAccount();

  useEffect(() => {
    if (!open) createAccount.reset();
  }, [open, createAccount]);

  const handleClose = useCallback(() => {
    setName("");
    setType(String(AccountType.CASH));
    setSubType("");
    setStartingBalance("");
    setSyncProvider("manual");
    setPlaidLinkCompleted(false);
    lastPlaidMetadataRef.current = null;
    createAccount.reset();
    onClose();
  }, [onClose, createAccount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (syncProvider === "manual") {
      if (type === null) return;
      if (!name.trim() || !subType || !startingBalance) return;

      const manualType = Number(type) as AccountType;
      const body: CreateAccountInput = {
        name: name.trim(),
        type: manualType,
        subType,
        startingBalance,
        sync: { provider: "manual" },
      };

      createAccount.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
      return;
    }

    const meta = lastPlaidMetadataRef.current;
    if (!meta || !plaidLinkCompleted) return;

    const body = buildPlaidAccountBody(name, meta);
    createAccount.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isManualFormValid =
    !!name.trim() &&
    type !== null &&
    !!subType &&
    !!startingBalance;

  const showCreateAccountButton =
    syncProvider === "manual" ||
    (syncProvider === "plaid" && createAccount.isError && plaidLinkCompleted);

  const selectedSyncMeta = ACCOUNT_SYNC_OPTIONS.find((o) => o.id === syncProvider);
  const showManualAccountFields = syncProvider === "manual";

  const handlePlaidLinked = useCallback(
    (_publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      lastPlaidMetadataRef.current = metadata;
      setPlaidLinkCompleted(true);

      const body = buildPlaidAccountBody(name, metadata);
      if (!name.trim()) {
        setName(body.name);
      }

      createAccount.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [name, createAccount, handleClose],
  );

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title={
        <Title order={4} component="span" c="brand.7" fw={600}>
          New Account
        </Title>
      }
      centered
      size={520}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Stack gap="md" mb="md">
          {createAccount.isError && (
            <Alert color="red" title="Error">
              {createAccount.error.message}
            </Alert>
          )}

          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required={syncProvider === "manual"}
            description={
              syncProvider === "plaid"
                ? "Optional — defaults to your linked account or institution name"
                : undefined
            }
            autoFocus
          />

          <Text size="sm" c="dimmed">
            Bank and data connections can only be chosen while you create this account.
          </Text>

          <Select
            label="Integrations"
            placeholder="Choose integration"
            value={syncProvider}
            onChange={(v) => {
              const next = (v ?? "manual") as AccountSyncProviderId;
              setSyncProvider(next);
              if (next !== "plaid") {
                setPlaidLinkCompleted(false);
                lastPlaidMetadataRef.current = null;
              }
            }}
            data={SYNC_SELECT_DATA}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />

          {selectedSyncMeta &&
            syncProvider !== "manual" &&
            (selectedSyncMeta.description || selectedSyncMeta.selectedHelp) && (
              <Alert color="gray" variant="light">
                <Text size="sm" fw={500} mb={4}>
                  {selectedSyncMeta.label}
                </Text>
                {selectedSyncMeta.description ? (
                  <Text size="sm" c="dimmed">
                    {selectedSyncMeta.description}
                  </Text>
                ) : null}
                {selectedSyncMeta.selectedHelp ? (
                  <Text size="sm" mt={selectedSyncMeta.description ? "sm" : 0}>
                    {selectedSyncMeta.selectedHelp}
                  </Text>
                ) : null}
              </Alert>
            )}

          {syncProvider === "plaid" && (
            <PlaidConnectButton
              active={syncProvider === "plaid"}
              linked={plaidLinkCompleted}
              onLinked={handlePlaidLinked}
              disabled={createAccount.isPending}
            />
          )}

          {showManualAccountFields && (
            <>
              <Select
                label="Type"
                value={type}
                onChange={setType}
                data={ACCOUNT_TYPES}
                required
                comboboxProps={{ withinPortal: true }}
              />

              <TextInput
                label="Sub Type"
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                placeholder="e.g. Checking, Savings"
                required
              />

              <TextInput
                label="Starting Balance"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
                description="Decimal amount (e.g. 0.00 or -500.00)"
                required
              />
            </>
          )}
        </Stack>

        {showCreateAccountButton ? (
          <Button
            type="submit"
            fullWidth
            color="brand"
            disabled={
              createAccount.isPending ||
              (syncProvider === "manual" && !isManualFormValid)
            }
            leftSection={createAccount.isPending ? <Loader size="sm" /> : null}
          >
            {createAccount.isPending
              ? "Creating..."
              : syncProvider === "plaid" && createAccount.isError
                ? "Try again"
                : "Create Account"}
          </Button>
        ) : null}
      </Box>
    </Modal>
  );
}
