import { useRef } from "react";
import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetMatrixMonthWindow } from "./useBudgetMatrixMonthWindow.js";
import { useExtendableMonthRange } from "./useExtendableMonthRange.js";
import { MAX_TOTAL_MONTHS, MONTH_COLUMN_PX } from "./budgetMatrix.js";

function setup(ready = true) {
  const element = document.createElement("div");
  Object.defineProperties(element, {
    clientWidth: { value: 600 },
    scrollWidth: {
      get: () => 220 + result.current.months.length * MONTH_COLUMN_PX,
    },
  });
  const scrollTo = vi.fn();
  element.scrollTo = scrollTo;
  const { result, rerender, unmount } = renderHook(
    ({ layoutReady }) => {
      const window = useBudgetMatrixMonthWindow();
      const scrollRef = useRef<HTMLDivElement | null>(element);
      const scrolling = useExtendableMonthRange({
        ...window,
        scrollRef,
        monthCount: window.months.length,
        layoutReady,
      });
      return { ...window, ...scrolling };
    },
    { initialProps: { layoutReady: ready } },
  );
  const scroll = (left: number) =>
    act(() => {
      element.scrollLeft = left;
      fireEvent.scroll(element);
      vi.advanceTimersToNextFrame();
    });
  return { result, rerender, unmount, element, scroll, scrollTo };
}

describe("matrix month scrolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });
  afterEach(() => vi.useRealTimers());

  it("starts with 73 months and scrolls to today only after loading", () => {
    const { result, element, rerender, scrollTo } = setup(false);
    expect(result.current.months).toHaveLength(73);
    expect(result.current.months[0]).toEqual({ year: 2023, month: 1 });
    expect(result.current.months.at(-1)).toEqual({ year: 2029, month: 1 });
    expect(element.scrollLeft).toBe(0);
    rerender({ layoutReady: true });
    expect(element.scrollLeft).toBe(3600);
    act(() => result.current.scrollToCurrentMonth());
    expect(scrollTo).toHaveBeenCalledWith({ left: 3600, behavior: "smooth" });
  });

  it("prepends a year while preserving the viewed month and updates Today", () => {
    const { result, element, scroll, scrollTo } = setup();
    scroll(50);
    expect(result.current.months).toHaveLength(85);
    expect(result.current.months[0]).toEqual({ year: 2022, month: 1 });
    expect(element.scrollLeft).toBe(1250);
    act(() => result.current.scrollToCurrentMonth());
    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 4800,
      behavior: "smooth",
    });
  });

  it("appends a year without moving the viewport or extending in the middle", () => {
    const { result, element, scroll } = setup();
    scroll(3000);
    expect(result.current.months).toHaveLength(73);
    const right = element.scrollWidth - element.clientWidth;
    scroll(right);
    expect(result.current.months).toHaveLength(85);
    expect(result.current.months.at(-1)).toEqual({ year: 2030, month: 1 });
    expect(element.scrollLeft).toBe(right);
  });

  it("stops at the cap and cancels pending scroll work on unmount", () => {
    const { result, element, scroll, unmount } = setup();
    while (result.current.months.length < MAX_TOTAL_MONTHS)
      scroll(element.scrollWidth - element.clientWidth);
    scroll(element.scrollWidth - element.clientWidth);
    scroll(0);
    expect(result.current.months).toHaveLength(MAX_TOTAL_MONTHS);
    fireEvent.scroll(element);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
