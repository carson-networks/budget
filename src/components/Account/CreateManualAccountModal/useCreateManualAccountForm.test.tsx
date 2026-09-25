import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountType } from "../../../connectRPC/types.js";
import { AccountKind } from "../../../models";

const { mutateMock, resetMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  resetMock: vi.fn(),
}));

vi.mock("../../../hooks/useAccounts.js", () => ({
  useCreateManualAccount: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { useCreateManualAccountForm } from "./useCreateManualAccountForm.js";

function fakeSubmitEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe("useCreateManualAccountForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateMock.mockImplementation(
      (_body: unknown, opts?: { onSuccess?: () => void }) => {
        opts?.onSuccess?.();
      },
    );
  });

  it("starts with isFormValid false until all trimmed fields are set", () => {
    const { result } = renderHook(() =>
      useCreateManualAccountForm(true, vi.fn()),
    );

    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setName("  Bills  ");
    });
    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setSubType(" Checking ");
    });
    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setStartingBalance("10.00");
    });
    expect(result.current.isFormValid).toBe(true);
  });

  it("does not call mutate when handleSubmit runs with empty trimmed fields", () => {
    const { result } = renderHook(() =>
      useCreateManualAccountForm(true, vi.fn()),
    );

    act(() => {
      result.current.setName("   ");
      result.current.setSubType("Checking");
      result.current.setStartingBalance("1");
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("does not call mutate when type is null", () => {
    const { result } = renderHook(() =>
      useCreateManualAccountForm(true, vi.fn()),
    );

    act(() => {
      result.current.setName("Ok");
      result.current.setSubType("Checking");
      result.current.setStartingBalance("0");
      result.current.setType(null);
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("calls mutate with trimmed fields and invokes onClose on success", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCreateManualAccountForm(true, onClose),
    );

    act(() => {
      result.current.setName("  Emergency  ");
      result.current.setSubType(" Savings ");
      result.current.setStartingBalance(" 100.50 ");
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).toHaveBeenCalledWith(
      {
        name: "Emergency",
        type: AccountType.CASH,
        subType: "Savings",
        startingBalance: "100.50",
      },
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("uses CreditCards AccountType when type state is credit kind", () => {
    const { result } = renderHook(() =>
      useCreateManualAccountForm(true, vi.fn()),
    );

    act(() => {
      result.current.setName("Card");
      result.current.setSubType("Visa");
      result.current.setStartingBalance("-25");
      result.current.setType(String(AccountKind.CreditCards));
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AccountType.CREDIT_CARDS,
      }),
      expect.any(Object),
    );
  });

  it("handleClose resets fields, calls mutation reset, and onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCreateManualAccountForm(true, onClose),
    );

    act(() => {
      result.current.setName("Temp");
      result.current.setSubType("Checking");
      result.current.setStartingBalance("5");
    });

    act(() => {
      result.current.handleClose();
    });

    expect(resetMock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(result.current.name).toBe("");
    expect(result.current.subType).toBe("");
    expect(result.current.startingBalance).toBe("");
    expect(result.current.type).toBe(String(AccountKind.Cash));
  });

  it("calls reset when open becomes false", () => {
    const { rerender } = renderHook(
      ({ open }) => useCreateManualAccountForm(open, vi.fn()),
      { initialProps: { open: true } },
    );

    rerender({ open: false });

    expect(resetMock).toHaveBeenCalled();
  });
});
