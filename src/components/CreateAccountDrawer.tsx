import { useState } from "react";
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
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useCreateAccount, type CreateAccountInput } from "../hooks/useAccounts";

interface CreateAccountDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 400;

const ACCOUNT_TYPES = [
  { value: "0", label: "Cash" },
  { value: "1", label: "Credit Cards" },
  { value: "2", label: "Investments" },
  { value: "3", label: "Loans" },
  { value: "4", label: "Assets" },
];

export default function CreateAccountDrawer({ open, onClose }: CreateAccountDrawerProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>("0");
  const [subType, setSubType] = useState("");
  const [startingBalance, setStartingBalance] = useState("");

  const createAccount = useCreateAccount();

  const resetForm = () => {
    setName("");
    setType("0");
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
      type: Number(type),
      subType,
      startingBalance,
    };

    createAccount.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isFormValid = name && type !== null && subType && startingBalance;

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
      <Box
        component="form"
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Group justify="space-between" mb="md" pb="md" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          <Title order={4} c="teal.7">New Account</Title>
          <ActionIcon variant="subtle" onClick={handleClose} aria-label="close">
            <IconX size={20} />
          </ActionIcon>
        </Group>

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
    </Drawer>
  );
}
