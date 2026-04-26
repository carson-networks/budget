import { useState, useEffect, useCallback } from "react";
import {
  useCreateTransaction,
  type CreateTransactionInput,
} from "../../hooks/useTransactions";

export function useCreateTransactionForm(
  open: boolean,
  onClose: () => void,
) {
  const [transactionName, setTransactionName] = useState("");
  const [accountID, setAccountID] = useState<string | null>(null);
  const [categoryID, setCategoryID] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const createTransaction = useCreateTransaction();

  useEffect(() => {
    if (!open) createTransaction.reset();
  }, [open, createTransaction]);

  const resetForm = useCallback(() => {
    setTransactionName("");
    setAccountID(null);
    setCategoryID("");
    setAmount("");
    setTransactionDate("");
    createTransaction.reset();
  }, [createTransaction]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!accountID) return;

      const body: CreateTransactionInput = {
        transactionName,
        accountId: accountID,
        categoryId: categoryID,
        amount,
        transactionDate: transactionDate
          ? new Date(transactionDate).toISOString()
          : new Date().toISOString(),
      };

      createTransaction.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [
      accountID,
      amount,
      categoryID,
      createTransaction,
      handleClose,
      transactionDate,
      transactionName,
    ],
  );

  const isFormValid = !!(
    transactionName &&
    accountID &&
    categoryID &&
    amount
  );

  return {
    transactionName,
    setTransactionName,
    accountID,
    setAccountID,
    categoryID,
    setCategoryID,
    amount,
    setAmount,
    transactionDate,
    setTransactionDate,
    createTransaction,
    handleSubmit,
    handleClose,
    isFormValid,
  };
}
