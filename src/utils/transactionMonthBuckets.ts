import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { Transaction } from "../gen/transaction/v1/transaction_pb.js";
import { yearMonthKey, type YearMonth } from "./monthRange";

export function transactionYearMonth(t: Transaction): YearMonth | null {
  const ts = t.transactionDate ?? t.createdAt;
  if (!ts) return null;
  const d = timestampDate(ts);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Sums transaction amounts per category for each calendar month (`yearMonthKey`). */
export function buildActualsByYearMonth(
  transactions: Transaction[],
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    const ym = transactionYearMonth(t);
    if (!ym || !t.categoryId) continue;
    const yk = yearMonthKey(ym);
    let inner = result.get(yk);
    if (!inner) {
      inner = new Map();
      result.set(yk, inner);
    }
    const amt = parseFloat(t.amount);
    if (Number.isNaN(amt)) continue;
    inner.set(t.categoryId, (inner.get(t.categoryId) ?? 0) + amt);
  }
  return result;
}
