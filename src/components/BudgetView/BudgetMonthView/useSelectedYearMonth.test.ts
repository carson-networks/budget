import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { useSelectedYearMonth } from "./useSelectedYearMonth.js";

describe("useSelectedYearMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the current month and moves with prev/next/today", () => {
    const { result } = renderHook(() => useSelectedYearMonth());
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 2 });

    act(() => {
      result.current.goNext();
    });
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });

    act(() => {
      result.current.goPrev();
      result.current.goPrev();
      result.current.goToToday();
    });
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });
  });
});
