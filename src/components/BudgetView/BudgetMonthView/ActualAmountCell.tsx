import { Text, UnstyledButton } from "@mantine/core";
import { formatCurrency } from "../../../models";

type ActualAmountCellProps = {
  value: number | undefined;
  categoryName: string;
  selected?: boolean;
  onSelect?: () => void;
};

export function ActualAmountCell({
  value,
  categoryName,
  selected = false,
  onSelect,
}: ActualAmountCellProps) {
  const label =
    value === undefined ? "—" : formatCurrency(value.toFixed(2));

  if (!onSelect) {
    return value === undefined ? (
      <Text span c="dimmed" size="sm">
        {label}
      </Text>
    ) : (
      <>{label}</>
    );
  }

  return (
    <UnstyledButton
      onClick={onSelect}
      aria-label={`Show ${categoryName} transactions`}
      aria-pressed={selected}
      fz="sm"
      c={selected ? "brand.7" : value === undefined ? "dimmed" : undefined}
      fw={selected ? 700 : undefined}
      td="underline dotted"
    >
      {label}
    </UnstyledButton>
  );
}
