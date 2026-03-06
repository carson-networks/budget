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
import { useCreateTransaction, type CreateTransactionInput } from "../hooks/useTransactions";
import { useAllAccounts } from "../hooks/useAccounts";

interface CreateTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 400;

export default function CreateTransactionDrawer({ open, onClose }: CreateTransactionDrawerProps) {
  const [transactionName, setTransactionName] = useState("");
  const [accountID, setAccountID] = useState<string | null>(null);
  const [categoryID, setCategoryID] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const createTransaction = useCreateTransaction();
  const { accounts } = useAllAccounts();

  const resetForm = () => {
    setTransactionName("");
    setAccountID(null);
    setCategoryID("");
    setAmount("");
    setTransactionDate("");
    createTransaction.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountID) return;

    const body: CreateTransactionInput = {
      transactionName,
      accountID,
      categoryID,
      amount,
      transactionDate: transactionDate
        ? new Date(transactionDate).toISOString()
        : new Date().toISOString(),
    };

    createTransaction.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isFormValid = transactionName && accountID && categoryID && amount;

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

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
          <Title order={4} c="teal.7">New Transaction</Title>
          <ActionIcon variant="subtle" onClick={handleClose} aria-label="close">
            <IconX size={20} />
          </ActionIcon>
        </Group>

        <Stack gap="md" style={{ flex: 1 }} mb="md">
          {createTransaction.isError && (
            <Alert color="red" title="Error">
              {createTransaction.error.message}
            </Alert>
          )}

          <TextInput
            label="Transaction Name"
            value={transactionName}
            onChange={(e) => setTransactionName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Account"
            value={accountID}
            onChange={setAccountID}
            data={accountOptions}
            placeholder="Select an account"
            required
            searchable
          />

          <TextInput
            label="Category ID"
            value={categoryID}
            onChange={(e) => setCategoryID(e.target.value)}
            placeholder="UUID"
            description="Enter the category UUID"
            required
          />

          <TextInput
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            description="Decimal amount (e.g. 12.50)"
            required
          />

          <TextInput
            label="Transaction Date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            description="Optional, defaults to today"
          />
        </Stack>

        <Box pt="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
          <Button
            type="submit"
            fullWidth
            color="teal"
            disabled={!isFormValid || createTransaction.isPending}
            leftSection={createTransaction.isPending ? <Loader size="sm" /> : null}
          >
            {createTransaction.isPending ? "Creating..." : "Create Transaction"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
