import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSelectedYearMonth } from "./useSelectedYearMonth.js";

function renderSelectedMonth(initialEntry = "/budget") {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialEntry] }, children);
  return renderHook(
    () => ({ ...useSelectedYearMonth(), search: useLocation().search }),
    { wrapper },
  );
}

describe("useSelectedYearMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to the current month and moves with prev/next/today", () => {
    const { result } = renderSelectedMonth();
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });

    act(() => result.current.goPrev());
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 2 });
    expect(result.current.search).toBe("?month=2025-02");

    act(() => result.current.goNext());
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });

    act(() => result.current.goPrev());
    act(() => result.current.goPrev());
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 1 });

    act(() => result.current.goToToday());
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });
    expect(result.current.search).toBe("");
  });

  it("reads the month from the URL and keeps other params", () => {
    const { result } = renderSelectedMonth("/budget?view=month&month=2024-12");
    expect(result.current.selectedMonth).toEqual({ year: 2024, month: 12 });

    act(() => result.current.goNext());
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 1 });
    expect(result.current.search).toBe("?view=month&month=2025-01");
  });

  it("falls back to the current month for an invalid param", () => {
    const { result } = renderSelectedMonth("/budget?month=2025-13");
    expect(result.current.selectedMonth).toEqual({ year: 2025, month: 3 });
  });
});
