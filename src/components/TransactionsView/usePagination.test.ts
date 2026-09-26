import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagination } from "./usePagination.js";

describe("usePagination", () => {
  it("slices items for the current page", () => {
    const items = ["a", "b", "c", "d", "e"];
    const { result } = renderHook(() => usePagination(items, 2));

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedItems).toEqual(["a", "b"]);

    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.paginatedItems).toEqual(["c", "d"]);

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.paginatedItems).toEqual(["e"]);
  });

  it("reports one page when the list is empty", () => {
    const { result } = renderHook(() => usePagination([], 25));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.paginatedItems).toEqual([]);
  });

  it("clamps the page when the item list shrinks", () => {
    let items = ["a", "b", "c", "d", "e"];
    const { result, rerender } = renderHook(
      ({ list }) => usePagination(list, 2),
      { initialProps: { list: items } },
    );

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    items = ["a", "b"];
    rerender({ list: items });
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toEqual(["a", "b"]);
  });
});
