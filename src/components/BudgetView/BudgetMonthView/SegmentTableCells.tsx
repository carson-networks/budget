import { Text, UnstyledButton } from "@mantine/core";
import { formatCurrency, type CategoryKind } from "../../../models";
import { categoryBudgetDifference } from "../budgetRollups.js";

function parseBudgetAmount(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? undefined : n;
}

export function ActualCell({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return (
      <Text span c="dimmed" size="sm">
        —
      </Text>
    );
  }
  return <>{formatCurrency(value.toFixed(2))}</>;
}

export function DifferenceCell({
  categoryKind,
  budgetRaw,
  actual,
}: {
  categoryKind: CategoryKind;
  budgetRaw: string | undefined;
  actual: number | undefined;
}) {
  const diff = categoryBudgetDifference(
    categoryKind,
    parseBudgetAmount(budgetRaw),
    actual,
  );
  if (diff === undefined) {
    return (
      <Text span c="dimmed" size="sm">
        —
      </Text>
    );
  }
  return (
    <Text
      span
      size="sm"
      fw={600}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatCurrency(diff.toFixed(2))}
    </Text>
  );
}

export function CategoryNameButton({ name }: { name: string }) {
  return (
    <UnstyledButton
      type="button"
      aria-label={`Open ${name} transactions`}
      fz="sm"
      fw="inherit"
    >
      {name}
    </UnstyledButton>
  );
}
