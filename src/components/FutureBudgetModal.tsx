import { useState } from "react";
import {
  Modal,
  Stack,
  Button,
  Group,
  Checkbox,
  Alert,
  Text,
} from "@mantine/core";
import BudgetAmountInput from "./BudgetAmountInput";
import { normalizeBudgetInput } from "../util/budgetCurrency";

interface FutureBudgetModalProps {
  opened: boolean;
  onClose: () => void;
  categoryLabel: string;
  monthLabel: string;
  /** Display string (may include commas); same source as the table field. */
  initialAmount: string;
  isPending: boolean;
  error: unknown;
  onSave: (amount: string, overwriteFutureMonths: boolean) => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Something went wrong";
  }
}

export default function FutureBudgetModal({
  opened,
  onClose,
  categoryLabel,
  monthLabel,
  initialAmount,
  isPending,
  error,
  onSave,
}: FutureBudgetModalProps) {
  const [amount, setAmount] = useState(() => initialAmount.trim());
  const [overwriteFuture, setOverwriteFuture] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normalizeBudgetInput(amount);
    if (!norm) return;
    onSave(norm, overwriteFuture);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Budget options" size="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {categoryLabel}
          </Text>
          <Text size="sm">
            The amount applies to <strong>{monthLabel}</strong>. Use the
            checkbox only if you also want to overwrite this category&apos;s
            budgets in later months.
          </Text>
          <BudgetAmountInput
            label="Budget amount"
            variant="default"
            size="sm"
            value={amount}
            onChange={setAmount}
            commitOnBlur={false}
            disabled={isPending}
            autoFocus
          />
          <Checkbox
            label="Overwrite budgets in future months for this category"
            checked={overwriteFuture}
            onChange={(e) => setOverwriteFuture(e.currentTarget.checked)}
          />
          {error != null ? (
            <Alert color="red" title="Error">
              {errorMessage(error)}
            </Alert>
          ) : null}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" color="teal" loading={isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
