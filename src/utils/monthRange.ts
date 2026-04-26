export type YearMonth = { year: number; month: number };

/** `month` is 1–12 (calendar month). */
export function currentYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const d = new Date(ym.year, ym.month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Inclusive of both start and end; assumes start ≤ end. */
export function monthsBetweenInclusive(start: YearMonth, end: YearMonth): YearMonth[] {
  if (
    start.year > end.year ||
    (start.year === end.year && start.month > end.month)
  ) {
    return [];
  }
  const r: YearMonth[] = [];
  let y = start.year;
  let m = start.month;
  for (;;) {
    r.push({ year: y, month: m });
    if (y === end.year && m === end.month) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return r;
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function formatYearMonthLabel(ym: YearMonth): string {
  return new Date(ym.year, ym.month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function yearMonthKey(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}
