import { useEffect, useState } from "react";
import { NumberInput } from "@mantine/core";

type BudgetCellInputProps = {
  /** Current amount from list budgets (`undefined` if no row yet). */
  amountStr: string | undefined;
  /**
   * Normalized whole-dollar amount string after commit. Prefer returning the
   * promise from `mutateAsync` so the input can revert on failure.
   */
  onCommit: (normalizedAmount: string) => unknown;
  /** When true, shows saving state for this cell. */
  saving?: boolean;
  disabled?: boolean;
  /** Font weight for the input (e.g. parent row). */
  fw?: number;
  label?: string;
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
  amountStr,
  onCommit,
  saving = false,
  disabled,
  fw = 400,
  label,
}: BudgetCellInputProps) {
  const [val, setVal] = useState<number | string | "">(() =>
    parseToNumber(amountStr),
  );

  useEffect(() => {
    setVal(parseToNumber(amountStr));
  }, [amountStr]);

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
    void Promise.resolve(onCommit(next)).catch(() => {
      setVal(parseToNumber(amountStr));
    });
  };

  return (
    <NumberInput
      aria-label={label}
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
        root: { width: "100%" },
        input: {
          textAlign: "right",
          fontWeight: fw,
          fontSize: "var(--mantine-font-size-sm)",
          fontVariantNumeric: "tabular-nums",
          paddingRight: 2,
          minHeight: 26,
        },
      }}
    />
  );
}
