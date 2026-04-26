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
import { ACCOUNT_SYNC_OPTIONS } from "../../constants/accountSyncIntegrations";
import { useCreateAccountForm } from "./useCreateAccountForm";
import { PlaidConnectButton } from "../PlaidConnectButton/Button";
import { IntegrationExplainer } from "./IntegrationExplainer";
import { ManualAccountFields } from "./ManualAccountFields";

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
}

const SYNC_SELECT_DATA = ACCOUNT_SYNC_OPTIONS.map((o) => ({
  value: o.id,
  label: o.available ? o.label : `${o.label} (coming soon)`,
  disabled: !o.available,
}));

export default function CreateAccountModal({ open, onClose }: CreateAccountModalProps) {
  const {
    name,
    setName,
    type,
    setType,
    subType,
    setSubType,
    startingBalance,
    setStartingBalance,
    syncProvider,
    setSyncProvider,
    plaidLinkCompleted,
    createAccount,
    handleClose,
    handleSubmit,
    handlePlaidLinked,
    isManualFormValid,
    showCreateAccountButton,
    selectedSyncMeta,
    showManualAccountFields,
  } = useCreateAccountForm(open, onClose);

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
            onChange={setSyncProvider}
            data={SYNC_SELECT_DATA}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />

          <IntegrationExplainer
            meta={selectedSyncMeta}
            show={syncProvider !== "manual"}
          />

          {syncProvider === "plaid" && (
            <PlaidConnectButton
              active={syncProvider === "plaid"}
              linked={plaidLinkCompleted}
              onLinked={handlePlaidLinked}
              disabled={createAccount.isPending}
            />
          )}

          {showManualAccountFields && (
            <ManualAccountFields
              type={type}
              onTypeChange={setType}
              subType={subType}
              onSubTypeChange={setSubType}
              startingBalance={startingBalance}
              onStartingBalanceChange={setStartingBalance}
            />
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
