import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDeleteConfirmation } from "./useDeleteConfirmation.js";

describe("useDeleteConfirmation", () => {
  it("starts disarmed", () => {
    const { result } = renderHook(() => useDeleteConfirmation());
    expect(result.current.armed).toBe(false);
  });

  it("arms and disarms delete confirmation", () => {
    const { result } = renderHook(() => useDeleteConfirmation());

    act(() => {
      result.current.arm();
    });
    expect(result.current.armed).toBe(true);

    act(() => {
      result.current.disarm();
    });
    expect(result.current.armed).toBe(false);
  });

  it("reset clears the armed state", () => {
    const { result } = renderHook(() => useDeleteConfirmation());

    act(() => {
      result.current.arm();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.armed).toBe(false);
  });
});
