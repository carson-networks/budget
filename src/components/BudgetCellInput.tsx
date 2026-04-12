import { useEffect, useState } from "react";
import { NumberInput } from "@mantine/core";
import { useSetBudget } from "../hooks/useBudgets";

export type BudgetCellInputProps = {
  categoryId: string;
  year: number;
  month: number;
  /** Current amount from list budgets (`undefined` if no row yet). */
  amountStr: string | undefined;
  /** When true, `SetBudget` applies through all future months (server); matrix uses header checkbox. */
  overwriteFutureMonths: boolean;
  disabled?: boolean;
  /** Font weight for the input (e.g. parent row in matrix). */
  fw?: number;
  /**
   * Single-line height to match plain text in dense tables (e.g. budget matrix
   * when toggling Budgeted vs Actual/Net).
   */
  compact?: boolean;
};

function parseToNumber(amountStr: string | undefined): number | "" {
  if (amountStr === undefined) return "";
  const n = parseFloat(amountStr);
  return Number.isNaN(n) ? "" : Math.round(n);
}

/** Whole dollars as stored on the budget (no cents). */
function normalizedAmountString(n: number): string {
  return String(Math.round(n));
}

export function BudgetCellInput({
  categoryId,
  year,
  month,
  amountStr,
  overwriteFutureMonths,
  disabled,
  fw = 400,
  compact = false,
}: BudgetCellInputProps) {
  const mutation = useSetBudget();
  const [val, setVal] = useState<number | string | "">(() =>
    parseToNumber(amountStr),
  );

  useEffect(() => {
    setVal(parseToNumber(amountStr));
  }, [amountStr]);

  const saving =
    mutation.isPending &&
    mutation.variables?.categoryId === categoryId &&
    mutation.variables.year === year &&
    mutation.variables.month === month;

  const commit = () => {
    const raw =
      val === "" || val === undefined
        ? NaN
        : typeof val === "string"
          ? parseFloat(val)
          : val;
    const num = Number.isNaN(Number(raw)) ? 0 : Number(raw);
    const next = normalizedAmountString(num);
    const prevNum = amountStr !== undefined ? parseFloat(amountStr) : NaN;
    const prevNorm = Number.isNaN(prevNum)
      ? "0"
      : normalizedAmountString(prevNum);
    if (next === prevNorm) return;
    if (next === "0" && amountStr === undefined) return;
    mutation.mutate(
      {
        categoryId,
        year,
        month,
        amount: next,
        overwriteFutureMonths,
      },
      {
        onError: () => {
          setVal(parseToNumber(amountStr));
        },
      },
    );
  };

  return (
    <NumberInput
      min={0}
      clampBehavior="strict"
      allowNegative={false}
      allowDecimal={false}
      hideControls
      size="xs"
      variant="unstyled"
      prefix="$"
      thousandSeparator=","
      decimalScale={0}
      value={val === "" ? undefined : val}
      onChange={(v) => setVal(v ?? "")}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      disabled={disabled || saving}
      styles={{
        root: {
          width: "100%",
          ...(compact
            ? {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                minHeight: 0,
              }
            : {}),
        },
        wrapper: compact
          ? { minHeight: 0, alignItems: "center" }
          : undefined,
        section: compact
          ? { display: "flex", alignItems: "center", marginRight: 1 }
          : undefined,
        input: {
          textAlign: "right",
          fontWeight: fw,
          fontSize: "var(--mantine-font-size-sm)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: compact ? 1.45 : undefined,
          padding: compact ? 0 : undefined,
          paddingRight: compact ? 0 : 2,
          minHeight: compact ? 0 : 26,
          height: compact ? "auto" : undefined,
        },
      }}
    />
  );
}
