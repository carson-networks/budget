import { useCallback } from "react";
import type { Account } from "../../../models";
import { useDeleteAccount } from "../../../hooks/useAccounts.js";
import { useDeleteConfirmation } from "../../../hooks/useDeleteConfirmation.js";

export function useEditAccountModal(account: Account | null, onClose: () => void) {
  const deleteAccount = useDeleteAccount();
  const { armed: deleteArmed, arm, disarm, reset: resetDelete } =
    useDeleteConfirmation();

  const handleClose = useCallback(() => {
    resetDelete();
    deleteAccount.reset();
    onClose();
  }, [deleteAccount, onClose, resetDelete]);

  const handleConfirmDelete = useCallback(() => {
    if (!account) return;
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        resetDelete();
        handleClose();
      },
    });
  }, [account, deleteAccount, handleClose, resetDelete]);

  return {
    deleteAccount,
    deleteArmed,
    arm,
    disarm,
    handleClose,
    handleConfirmDelete,
    canDelete: true,
  };
}
