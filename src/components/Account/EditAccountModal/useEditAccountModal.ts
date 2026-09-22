import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import type { Account } from "../../../models";
import {
  useDeleteAccount,
  useUpdateAccount,
} from "../../../hooks/useAccounts.js";
import { useDeleteConfirmation } from "../../../hooks/useDeleteConfirmation.js";

/** Form + delete state for a single account. Remount with `key={account.id}`. */
export function useEditAccountModal(account: Account, onClose: () => void) {
  const [name, setName] = useState(account.name);
  const [subType, setSubType] = useState(account.subType);
  const [startingBalance, setStartingBalance] = useState(
    account.startingBalance,
  );

  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const {
    armed: deleteConfirmOpen,
    arm: openDeleteConfirm,
    disarm: closeDeleteConfirm,
    reset: resetDeleteConfirm,
  } = useDeleteConfirmation();

  useEffect(() => {
    return () => {
      updateAccount.reset();
      deleteAccount.reset();
    };
  }, [updateAccount, deleteAccount]);

  const handleClose = useCallback(() => {
    resetDeleteConfirm();
    updateAccount.reset();
    deleteAccount.reset();
    onClose();
  }, [deleteAccount, onClose, resetDeleteConfirm, updateAccount]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !subType.trim() || !startingBalance.trim()) return;

      updateAccount.mutate(
        {
          id: account.id,
          name: name.trim(),
          subType: subType.trim(),
          startingBalance: startingBalance.trim(),
        },
        {
          onSuccess: () => {
            handleClose();
          },
        },
      );
    },
    [account.id, handleClose, name, startingBalance, subType, updateAccount],
  );

  const handleConfirmDelete = useCallback(() => {
    deleteAccount.mutate(account.id, {
      onSuccess: () => {
        resetDeleteConfirm();
        handleClose();
      },
    });
  }, [account.id, deleteAccount, handleClose, resetDeleteConfirm]);

  const isFormValid =
    !!name.trim() && !!subType.trim() && !!startingBalance.trim();

  const busy = updateAccount.isPending || deleteAccount.isPending;

  return {
    name,
    setName,
    subType,
    setSubType,
    startingBalance,
    setStartingBalance,
    updateAccount,
    deleteAccount,
    deleteConfirmOpen,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleClose,
    handleSubmit,
    handleConfirmDelete,
    isFormValid,
    busy,
    canDelete: true,
  };
}
