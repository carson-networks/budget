import { useState, useEffect } from "react";
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
} from "@mantine/core";
import {
  useCreateAccount,
  AccountType,
  type CreateAccountInput,
} from "../hooks/useAccounts";

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES = [
  { value: String(AccountType.CASH), label: "Cash" },
  { value: String(AccountType.CREDIT_CARDS), label: "Credit Cards" },
];

export default function CreateAccountModal({ open, onClose }: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(String(AccountType.CASH));
  const [subType, setSubType] = useState("");
  const [startingBalance, setStartingBalance] = useState("");

  const createAccount = useCreateAccount();

  useEffect(() => {
    if (!open) createAccount.reset();
  }, [open, createAccount]);

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

    createAccount.mutate(body, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isFormValid = name && type !== null && subType && startingBalance;

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
      size={440}
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

        <Button
          type="submit"
          fullWidth
          color="brand"
          disabled={!isFormValid || createAccount.isPending}
          leftSection={createAccount.isPending ? <Loader size="sm" /> : null}
        >
          {createAccount.isPending ? "Creating..." : "Create Account"}
        </Button>
      </Box>
    </Modal>
  );
}
