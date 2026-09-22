import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { useEditAccountModal } from "./useEditAccountModal.js";

const { mutateMock, resetMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  resetMock: vi.fn(),
}));

vi.mock("../../../hooks/useAccounts.js", () => ({
  useDeleteAccount: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const account: Account = {
  id: "acc-1",
  name: "House Fund",
  accountKind: AccountKind.Cash,
  subType: "Checking",
  balance: "42.00",
  startingBalance: "0",
  integration: AccountIntegration.Manual,
};

describe("useEditAccountModal", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    resetMock.mockReset();
  });

  it("starts with delete confirm closed", () => {
    const { result } = renderHook(() =>
      useEditAccountModal(account, vi.fn()),
    );
    expect(result.current.deleteConfirmOpen).toBe(false);
    expect(result.current.canDelete).toBe(true);
  });

  it("opens and closes the delete confirm modal state", () => {
    const { result } = renderHook(() =>
      useEditAccountModal(account, vi.fn()),
    );

    act(() => {
      result.current.openDeleteConfirm();
    });
    expect(result.current.deleteConfirmOpen).toBe(true);

    act(() => {
      result.current.closeDeleteConfirm();
    });
    expect(result.current.deleteConfirmOpen).toBe(false);
  });

  it("handleClose resets delete confirm and mutation, then calls onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useEditAccountModal(account, onClose),
    );

    act(() => {
      result.current.openDeleteConfirm();
    });
    act(() => {
      result.current.handleClose();
    });

    expect(result.current.deleteConfirmOpen).toBe(false);
    expect(resetMock).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handleConfirmDelete mutates with the account id and closes on success", () => {
    const onClose = vi.fn();
    mutateMock.mockImplementation(
      (_id: string, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    const { result } = renderHook(() =>
      useEditAccountModal(account, onClose),
    );

    act(() => {
      result.current.handleConfirmDelete();
    });

    expect(mutateMock).toHaveBeenCalledWith("acc-1", expect.any(Object));
    expect(onClose).toHaveBeenCalledOnce();
    expect(resetMock).toHaveBeenCalled();
  });

  it("handleConfirmDelete is a no-op when account is null", () => {
    const { result } = renderHook(() => useEditAccountModal(null, vi.fn()));

    act(() => {
      result.current.handleConfirmDelete();
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });
});
