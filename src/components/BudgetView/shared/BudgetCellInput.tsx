import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, NumberInput } from "@mantine/core";
import { createPortal } from "react-dom";
import { FollowMonthsConfirm } from "./FollowMonthsConfirm.js";

type BudgetCellInputProps = {
  /** Current amount from list budgets (`undefined` if no row yet). */
  amountStr: string | undefined;
  /**
   * Normalized whole-dollar amount string after confirm. Prefer returning the
   * promise from `mutateAsync` so the input can revert on failure.
   */
  onCommit: (
    normalizedAmount: string,
    overwriteFutureMonths: boolean,
  ) => unknown;
  /** When true, shows saving state for this cell. */
  saving?: boolean;
  disabled?: boolean;
  /** Font weight for the input (e.g. parent row). */
  fw?: number;
};

type FloatPlacement = {
  top: number;
  left: number;
  placement: "above" | "below";
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

function nextNormalized(
  val: number | string | "",
  amountStr: string | undefined,
): string | null {
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
  if (next === prevNorm) return null;
  if (next === "0" && amountStr === undefined) return null;
  return next;
}

const CONFIRM_EST_HEIGHT = 110;
const GAP = 8;

function computePlacement(anchor: DOMRect): FloatPlacement {
  const preferAbove = anchor.top >= CONFIRM_EST_HEIGHT + GAP;
  const left = Math.min(
    Math.max(8, anchor.right - 260),
    window.innerWidth - 268,
  );
  if (preferAbove) {
    return {
      placement: "above",
      top: Math.max(8, anchor.top - CONFIRM_EST_HEIGHT - GAP),
      left,
    };
  }
  return {
    placement: "below",
    top: anchor.bottom + GAP,
    left,
  };
}

export function BudgetCellInput({
  amountStr,
  onCommit,
  saving = false,
  disabled,
  fw = 400,
}: BudgetCellInputProps) {
  const [val, setVal] = useState<number | string | "">(() =>
    parseToNumber(amountStr),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<string | null>(null);
  const [floatPos, setFloatPos] = useState<FloatPlacement | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (confirmOpen) return;
    setVal(parseToNumber(amountStr));
  }, [amountStr, confirmOpen]);

  useLayoutEffect(() => {
    if (!confirmOpen || !anchorRef.current) return;
    setFloatPos(computePlacement(anchorRef.current.getBoundingClientRect()));
  }, [confirmOpen]);

  useEffect(() => {
    if (!confirmOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelConfirm();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (confirmRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      cancelConfirm();
    };
    const onReposition = () => {
      if (!anchorRef.current) return;
      setFloatPos(computePlacement(anchorRef.current.getBoundingClientRect()));
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [confirmOpen, amountStr]);

  const cancelConfirm = () => {
    setConfirmOpen(false);
    setPendingAmount(null);
    setFloatPos(null);
    setVal(parseToNumber(amountStr));
  };

  const finishConfirm = (overwriteFutureMonths: boolean) => {
    if (pendingAmount === null) return;
    const amount = pendingAmount;
    setConfirmOpen(false);
    setPendingAmount(null);
    setFloatPos(null);
    void Promise.resolve(onCommit(amount, overwriteFutureMonths)).catch(() => {
      setVal(parseToNumber(amountStr));
    });
  };

  const requestConfirm = () => {
    if (confirmOpen) return;
    const next = nextNormalized(val, amountStr);
    if (next === null) return;
    setPendingAmount(next);
    setConfirmOpen(true);
  };

  return (
    <>
      <Box ref={anchorRef} style={{ width: "100%" }}>
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
          onBlur={requestConfirm}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={disabled || saving || confirmOpen}
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
      </Box>
      {confirmOpen && floatPos
        ? createPortal(
            <Box
              ref={confirmRef}
              data-placement={floatPos.placement}
              style={{
                position: "fixed",
                top: floatPos.top,
                left: floatPos.left,
                zIndex: 400,
              }}
            >
              <FollowMonthsConfirm
                onYes={() => finishConfirm(true)}
                onNo={() => finishConfirm(false)}
              />
            </Box>,
            document.body,
          )
        : null}
    </>
  );
}
