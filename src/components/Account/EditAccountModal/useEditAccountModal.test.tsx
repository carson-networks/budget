import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { useEditAccountModal } from "./useEditAccountModal.js";

const { mutateUpdateMock, resetUpdateMock, mutateDeleteMock, resetDeleteMock } =
  vi.hoisted(() => ({
    mutateUpdateMock: vi.fn(),
    resetUpdateMock: vi.fn(),
    mutateDeleteMock: vi.fn(),
    resetDeleteMock: vi.fn(),
  }));

vi.mock("../../../hooks/useAccounts.js", () => ({
  useUpdateAccount: () => ({
    mutate: mutateUpdateMock,
    reset: resetUpdateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteAccount: () => ({
    mutate: mutateDeleteMock,
    reset: resetDeleteMock,
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
  startingBalance: "10.00",
  integration: AccountIntegration.Manual,
};

describe("useEditAccountModal", () => {
  beforeEach(() => {
    mutateUpdateMock.mockReset();
    resetUpdateMock.mockReset();
    mutateDeleteMock.mockReset();
    resetDeleteMock.mockReset();
  });

  it("initializes fields from the account", () => {
    const { result } = renderHook(() =>
      useEditAccountModal(account, vi.fn()),
    );
    expect(result.current.name).toBe("House Fund");
    expect(result.current.subType).toBe("Checking");
    expect(result.current.startingBalance).toBe("10.00");
    expect(result.current.isFormValid).toBe(true);
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

  it("handleClose resets mutations and calls onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useEditAccountModal(account, onClose),
    );

    act(() => {
      result.current.handleClose();
    });

    expect(resetUpdateMock).toHaveBeenCalledOnce();
    expect(resetDeleteMock).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handleSubmit mutates updateAccount and closes on success", () => {
    const onClose = vi.fn();
    mutateUpdateMock.mockImplementation(
      (_body: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    const { result } = renderHook(() =>
      useEditAccountModal(account, onClose),
    );

    act(() => {
      result.current.setName(" Renamed ");
      result.current.setSubType(" Savings ");
      result.current.setStartingBalance(" 25.00 ");
    });

    act(() => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as FormEvent);
    });

    expect(mutateUpdateMock).toHaveBeenCalledWith(
      {
        id: "acc-1",
        name: "Renamed",
        subType: "Savings",
        startingBalance: "25.00",
      },
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("handleSubmit is a no-op when required fields are blank", () => {
    const { result } = renderHook(() =>
      useEditAccountModal(account, vi.fn()),
    );

    act(() => {
      result.current.setName("   ");
    });

    act(() => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as FormEvent);
    });

    expect(mutateUpdateMock).not.toHaveBeenCalled();
  });

  it("handleConfirmDelete mutates with the account id and closes on success", () => {
    const onClose = vi.fn();
    mutateDeleteMock.mockImplementation(
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

    expect(mutateDeleteMock).toHaveBeenCalledWith("acc-1", expect.any(Object));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
