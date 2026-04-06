import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  Box,
  Stack,
  Group,
  Title,
  ActionIcon,
  TextInput,
  Select,
  Button,
  Alert,
  Loader,
  SegmentedControl,
  Text,
  Checkbox,
  Divider,
} from "@mantine/core";
import { IconX, IconBuildingBank } from "@tabler/icons-react";
import { usePlaidLink } from "react-plaid-link";
import { useCreateAccount, type CreateAccountInput } from "../hooks/useAccounts";
import {
  useCreateLinkToken,
  useExchangePlaidToken,
  type PlaidSyncAccount,
} from "../hooks/usePlaid";
import { AccountType } from "../gen/account/v1/account_pb.js";

interface CreateAccountDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 420;

/** Values match account.v1.AccountType (proto enum). */
const ACCOUNT_TYPES = [
  { value: String(AccountType.CASH), label: "Cash" },
  { value: String(AccountType.CREDIT_CARDS), label: "Credit Cards" },
];

const PLAID_TYPE_MAP: Record<string, AccountType> = {
  depository: AccountType.CASH,
  credit: AccountType.CREDIT_CARDS,
  investment: AccountType.CASH,
  loan: AccountType.CASH,
  other: AccountType.CASH,
};

function plaidTypeToAccountType(plaidType: string): AccountType {
  return PLAID_TYPE_MAP[plaidType.toLowerCase()] ?? AccountType.CASH;
}

interface PlaidAccount {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  balances?: { current?: number | null };
}

// ---- Manual form ----

interface ManualFormProps {
  onClose: () => void;
}

function ManualForm({ onClose }: ManualFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(String(AccountType.CASH));
  const [subType, setSubType] = useState("");
  const [startingBalance, setStartingBalance] = useState("");

  const createAccount = useCreateAccount();

  const resetForm = () => {
    setName("");
    setType(String(AccountType.CASH));
    setSubType("");
    setStartingBalance("");
    createAccount.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === null) return;

    const body: CreateAccountInput = {
      name,
      type: Number(type) as AccountType,
      subType,
      startingBalance,
    };

    createAccount.mutate(body, { onSuccess: handleClose });
  };

  const isFormValid = name && type !== null && subType && startingBalance;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      <Stack gap="md" style={{ flex: 1 }} mb="md">
        {createAccount.isError && (
          <Alert color="red" title="Error">
            {createAccount.error.message}
          </Alert>
        )}

        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Select
          label="Type"
          value={type}
          onChange={setType}
          data={ACCOUNT_TYPES}
          required
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
      </Stack>

      <Box pt="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
        <Button
          type="submit"
          fullWidth
          color="teal"
          disabled={!isFormValid || createAccount.isPending}
          leftSection={createAccount.isPending ? <Loader size="sm" /> : null}
        >
          {createAccount.isPending ? "Creating..." : "Create Account"}
        </Button>
      </Box>
    </Box>
  );
}

// ---- Plaid connect step (pure UI, no Plaid hook) ----

interface PlaidConnectStepProps {
  onConnect: () => void;
  isLoading: boolean;
  error: string | null;
}

function PlaidConnectStep({ onConnect, isLoading, error }: PlaidConnectStepProps) {
  return (
    <Box style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Stack align="center" gap="md">
        {error && (
          <Alert color="red" title="Error" w="100%">
            {error}
          </Alert>
        )}

        <IconBuildingBank size={48} color="var(--mantine-color-teal-6)" />
        <Text ta="center" c="dimmed" size="sm">
          Connect your bank account securely via Plaid.
        </Text>

        <Button color="teal" onClick={onConnect} loading={isLoading}>
          Connect Bank
        </Button>
      </Stack>
    </Box>
  );
}

// ---- Plaid confirm step ----

interface PlaidConfirmStepProps {
  publicToken: string;
  institutionId: string;
  institutionName: string;
  plaidAccounts: PlaidAccount[];
  onClose: () => void;
  onBack: () => void;
}

function PlaidConfirmStep({
  publicToken,
  institutionId,
  institutionName,
  plaidAccounts,
  onClose,
  onBack,
}: PlaidConfirmStepProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(plaidAccounts.map((a) => a.id))
  );
  const exchangeToken = useExchangePlaidToken();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const accounts: PlaidSyncAccount[] = plaidAccounts
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        plaidAccountId: a.id,
        name: a.name,
        type: plaidTypeToAccountType(a.type),
        subType: a.subtype ?? a.type,
        balance: String(a.balances?.current ?? 0),
      }));

    exchangeToken.mutate(
      { publicToken, institutionId, institutionName, accounts },
      { onSuccess: onClose }
    );
  };

  return (
    <Box style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Stack gap="xs" style={{ flex: 1 }} mb="md">
        {exchangeToken.isError && (
          <Alert color="red" title="Error">
            {exchangeToken.error.message}
          </Alert>
        )}

        <Text size="sm" c="dimmed">
          Select which accounts to import from {institutionName}:
        </Text>

        <Divider />

        {plaidAccounts.map((a) => (
          <Group key={a.id} justify="space-between" wrap="nowrap">
            <Checkbox
              checked={selected.has(a.id)}
              onChange={() => toggle(a.id)}
              label={
                <Box>
                  <Text size="sm" fw={500}>{a.name}</Text>
                  <Text size="xs" c="dimmed">
                    {a.type}{a.subtype ? ` · ${a.subtype}` : ""}
                    {a.balances?.current != null
                      ? ` · $${a.balances.current.toFixed(2)}`
                      : ""}
                  </Text>
                </Box>
              }
            />
          </Group>
        ))}
      </Stack>

      <Stack gap="sm" pt="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
        <Button
          fullWidth
          color="teal"
          disabled={selected.size === 0 || exchangeToken.isPending}
          leftSection={exchangeToken.isPending ? <Loader size="sm" /> : null}
          onClick={handleConfirm}
        >
          {exchangeToken.isPending
            ? "Importing..."
            : `Import ${selected.size} Account${selected.size !== 1 ? "s" : ""}`}
        </Button>
        <Button
          fullWidth
          variant="subtle"
          color="gray"
          onClick={onBack}
          disabled={exchangeToken.isPending}
        >
          Back
        </Button>
      </Stack>
    </Box>
  );
}

// ---- Main drawer ----

export default function CreateAccountDrawer({ open, onClose }: CreateAccountDrawerProps) {
  const [mode, setMode] = useState<"manual" | "plaid">("manual");
  const [plaidStep, setPlaidStep] = useState<"connect" | "confirm">("connect");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{
    institutionId: string;
    institutionName: string;
    accounts: PlaidAccount[];
  } | null>(null);

  // Link token fetched on demand; kept here so usePlaidLink is stable.
  const createLinkToken = useCreateLinkToken();
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // usePlaidLink is called exactly once — at this level — so the script is
  // never embedded more than once regardless of which child step is visible.
  const { open: openPlaidLink, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      const meta = metadata as unknown as {
        institution: { institution_id: string; name: string } | null;
        accounts: PlaidAccount[];
      };
      setPendingToken(publicToken);
      setPendingMeta({
        institutionId: meta.institution?.institution_id ?? "",
        institutionName: meta.institution?.name ?? "Unknown",
        accounts: meta.accounts,
      });
      setPlaidStep("confirm");
    },
  });

  // Once we have a token and the widget is ready, open it automatically.
  // Guard with a ref to prevent double-fire in React 18 strict mode.
  const plaidOpenedRef = useRef(false);
  useEffect(() => {
    if (linkToken && ready && !plaidOpenedRef.current) {
      plaidOpenedRef.current = true;
      openPlaidLink();
    }
  }, [linkToken, ready, openPlaidLink]);

  const handleConnect = () => {
    if (linkToken && ready) {
      plaidOpenedRef.current = false;
      openPlaidLink();
      return;
    }
    plaidOpenedRef.current = false;
    createLinkToken.mutate(undefined, {
      onSuccess: (token) => setLinkToken(token),
    });
  };

  const handleClose = () => {
    setMode("manual");
    setPlaidStep("connect");
    setPendingToken(null);
    setPendingMeta(null);
    setLinkToken(null);
    plaidOpenedRef.current = false;
    createLinkToken.reset();
    onClose();
  };

  const title =
    mode === "manual"
      ? "New Account"
      : plaidStep === "confirm"
        ? "Import Accounts"
        : "Link Bank Account";

  const connectError = createLinkToken.isError ? createLinkToken.error.message : null;
  const connectLoading =
    createLinkToken.isPending || (linkToken != null && !ready);

  return (
    <Drawer
      position="right"
      opened={open}
      onClose={handleClose}
      title={null}
      withCloseButton={false}
      size={DRAWER_WIDTH}
      styles={{ body: { height: "100%", display: "flex", flexDirection: "column" } }}
    >
      <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Group
          justify="space-between"
          mb="md"
          pb="md"
          style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
        >
          <Title order={4} c="teal.7">{title}</Title>
          <ActionIcon variant="subtle" onClick={handleClose} aria-label="close">
            <IconX size={20} />
          </ActionIcon>
        </Group>

        {plaidStep !== "confirm" && (
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as "manual" | "plaid")}
            data={[
              { value: "manual", label: "Manual" },
              { value: "plaid", label: "Link with Plaid" },
            ]}
            fullWidth
            mb="md"
            color="teal"
          />
        )}

        {mode === "manual" && <ManualForm onClose={handleClose} />}

        {mode === "plaid" && plaidStep === "connect" && (
          <PlaidConnectStep
            onConnect={handleConnect}
            isLoading={connectLoading}
            error={connectError}
          />
        )}

        {mode === "plaid" &&
          plaidStep === "confirm" &&
          pendingToken &&
          pendingMeta && (
            <PlaidConfirmStep
              publicToken={pendingToken}
              institutionId={pendingMeta.institutionId}
              institutionName={pendingMeta.institutionName}
              plaidAccounts={pendingMeta.accounts}
              onClose={handleClose}
              onBack={() => setPlaidStep("connect")}
            />
          )}
      </Box>
    </Drawer>
  );
}
