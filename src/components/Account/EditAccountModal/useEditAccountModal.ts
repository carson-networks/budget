import { useCallback } from "react";
import type { Account } from "../../../models";
import { useDeleteAccount } from "../../../hooks/useAccounts.js";
import { useDeleteConfirmation } from "../../../hooks/useDeleteConfirmation.js";

export function useEditAccountModal(account: Account | null, onClose: () => void) {
  const deleteAccount = useDeleteAccount();
  const {
    armed: deleteConfirmOpen,
    arm: openDeleteConfirm,
    disarm: closeDeleteConfirm,
    reset: resetDeleteConfirm,
  } = useDeleteConfirmation();

  const handleClose = useCallback(() => {
    resetDeleteConfirm();
    deleteAccount.reset();
    onClose();
  }, [deleteAccount, onClose, resetDeleteConfirm]);

  const handleConfirmDelete = useCallback(() => {
    if (!account) return;
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        resetDeleteConfirm();
        handleClose();
      },
    });
  }, [account, deleteAccount, handleClose, resetDeleteConfirm]);

  return {
    deleteAccount,
    deleteConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleClose,
    handleConfirmDelete,
    canDelete: true,
  };
}
