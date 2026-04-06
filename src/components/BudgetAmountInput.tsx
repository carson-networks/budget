import { TextInput, Text } from "@mantine/core";
import {
  normalizeBudgetInput,
  parseBudgetAmount,
  formatUsdNumberPart,
} from "../util/budgetCurrency";

export interface BudgetAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * When `commitOnBlur` is true (default), called on blur/Enter with a normalized API string.
   * Omit or set `commitOnBlur` to false for dialogs where only form submit should persist.
   */
  onCommit?: (normalizedValue: string) => void;
  /** If false, blur only pretty-prints the value via onChange (no onCommit). Default true. */
  commitOnBlur?: boolean;
  disabled?: boolean;
  label?: string;
  variant?: "table" | "default";
  size?: "xs" | "sm" | "md";
  placeholder?: string;
  "aria-label"?: string;
  autoFocus?: boolean;
}

const DOLLAR = (
  <Text span c="dimmed" fz="inherit" fw={500} style={{ userSelect: "none" }}>
    $
  </Text>
);

/**
 * Shared budget field with a $ prefix. Parsing/normalization matches {@link ../util/budgetCurrency}.
 */
export default function BudgetAmountInput({
  value,
  onChange,
  onCommit,
  commitOnBlur = true,
  disabled,
  label,
  variant = "default",
  size = "sm",
  placeholder = "0.00",
  "aria-label": ariaLabel,
  autoFocus,
}: BudgetAmountInputProps) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = normalizeBudgetInput(e.currentTarget.value);

    if (!commitOnBlur) {
      if (raw === "") {
        onChange("");
        return;
      }
      const n = parseBudgetAmount(raw);
      onChange(n !== null ? formatUsdNumberPart(n) : raw);
      return;
    }

    onCommit?.(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const isTable = variant === "table";

  return (
    <TextInput
      label={label}
      size={size}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      autoFocus={autoFocus}
      aria-label={ariaLabel ?? (label ? undefined : "Budget amount")}
      leftSection={DOLLAR}
      leftSectionWidth={28}
      styles={
        isTable
          ? {
              input: {
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                minHeight: 28,
                paddingInline: 6,
                borderRadius: 4,
                border: "1px solid var(--mantine-color-default-border)",
                backgroundColor: "var(--mantine-color-body)",
              },
              section: { justifyContent: "center" },
            }
          : {
              input: {
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              },
              section: { justifyContent: "center" },
            }
      }
      variant={isTable ? "unstyled" : "default"}
    />
  );
}
