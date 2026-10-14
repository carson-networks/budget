import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useNeedsReviewOnly } from "./useNeedsReviewOnly.js";

function renderNeedsReviewOnly(initialEntry = "/transactions") {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialEntry] }, children);
  return renderHook(
    () => ({
      state: useNeedsReviewOnly(),
      search: useLocation().search,
    }),
    { wrapper },
  );
}

describe("useNeedsReviewOnly", () => {
  it("is off by default", () => {
    const { result } = renderNeedsReviewOnly();
    expect(result.current.state[0]).toBe(false);
  });

  it("reads the filter from the URL", () => {
    const { result } = renderNeedsReviewOnly("/transactions?needsReview=true");
    expect(result.current.state[0]).toBe(true);
  });

  it("writes the filter to the URL and clears it again", () => {
    const { result } = renderNeedsReviewOnly("/transactions?month=2025-02");

    act(() => result.current.state[1](true));
    expect(result.current.state[0]).toBe(true);
    expect(result.current.search).toBe("?month=2025-02&needsReview=true");

    act(() => result.current.state[1](false));
    expect(result.current.state[0]).toBe(false);
    expect(result.current.search).toBe("?month=2025-02");
  });
});
