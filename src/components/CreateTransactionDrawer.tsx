import { useState, useMemo } from "react";
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
  Text,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useCreateTransaction, type CreateTransactionInput } from "../hooks/useTransactions";
import { useAllAccounts } from "../hooks/useAccounts";
import { useAllCategories } from "../hooks/useCategories";
import { categoryNameById, formatCategoryDisplayName } from "../util/categoryTree";

interface CreateTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 400;

export default function CreateTransactionDrawer({ open, onClose }: CreateTransactionDrawerProps) {
  const [transactionName, setTransactionName] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const createTransaction = useCreateTransaction();
  const { accounts } = useAllAccounts();
  const { categories } = useAllCategories();

  const categoryNameMap = useMemo(() => categoryNameById(categories), [categories]);

  const categoryOptions = useMemo(() => {
    const leaf = categories.filter((c) => !c.isParent && !c.isDisabled);
    return leaf
      .map((c) => ({
        value: c.id,
        label: formatCategoryDisplayName(c, categoryNameMap),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, categoryNameMap]);

  const resetForm = () => {
    setTransactionName("");
    setAccountId(null);
    setCategoryId(null);
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
    if (!accountId || !categoryId) return;

    const transactionDateIso = transactionDate
      ? new Date(`${transactionDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    const body: CreateTransactionInput = {
      transactionName,
      accountId,
      categoryId,
      amount,
      transactionDateIso,
    };

    createTransaction.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isFormValid = transactionName && accountId && categoryId && amount;

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
            value={accountId}
            onChange={setAccountId}
            data={accountOptions}
            placeholder="Select an account"
            required
            searchable
          />

          <Select
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            data={categoryOptions}
            placeholder={
              categoryOptions.length > 0
                ? "Select a category"
                : "Create a leaf category under a group first"
            }
            required
            searchable
            disabled={categoryOptions.length === 0}
          />
          {categoryOptions.length === 0 && (
            <Text size="sm" c="dimmed">
              Transactions must use a subcategory (not a group). Add leaf categories under
              Categories in the sidebar if this list is empty.
            </Text>
          )}

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
