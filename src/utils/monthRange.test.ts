import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMonths,
  compareYearMonth,
  currentYearMonth,
  formatYearMonthLabel,
  monthsBetweenInclusive,
  parseYearMonthKey,
  yearMonthKey,
} from "./monthRange.js";

describe("monthRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15)); // Mar 15, 2025 local
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("currentYearMonth uses the local calendar month", () => {
    expect(currentYearMonth()).toEqual({ year: 2025, month: 3 });
  });

  it("addMonths crosses year boundaries", () => {
    expect(addMonths({ year: 2025, month: 1 }, -1)).toEqual({
      year: 2024,
      month: 12,
    });
    expect(addMonths({ year: 2024, month: 12 }, 1)).toEqual({
      year: 2025,
      month: 1,
    });
  });

  it("monthsBetweenInclusive returns inclusive calendar months", () => {
    expect(
      monthsBetweenInclusive(
        { year: 2025, month: 11 },
        { year: 2026, month: 1 },
      ),
    ).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
  });

  it("monthsBetweenInclusive returns empty when start is after end", () => {
    expect(
      monthsBetweenInclusive(
        { year: 2025, month: 3 },
        { year: 2025, month: 1 },
      ),
    ).toEqual([]);
  });

  it("compareYearMonth orders by year then month", () => {
    expect(
      compareYearMonth({ year: 2024, month: 12 }, { year: 2025, month: 1 }),
    ).toBeLessThan(0);
    expect(
      compareYearMonth({ year: 2025, month: 3 }, { year: 2025, month: 3 }),
    ).toBe(0);
  });

  it("formatYearMonthLabel and yearMonthKey format stably", () => {
    expect(formatYearMonthLabel({ year: 2025, month: 3 })).toBe("Mar 2025");
    expect(yearMonthKey({ year: 2025, month: 3 })).toBe("2025-03");
  });

  it("parses year-month keys and rejects invalid ones", () => {
    expect(parseYearMonthKey("2025-03")).toEqual({ year: 2025, month: 3 });
    expect(parseYearMonthKey("2025-13")).toBeUndefined();
    expect(parseYearMonthKey("2025-3")).toBeUndefined();
    expect(parseYearMonthKey(null)).toBeUndefined();
  });
});
