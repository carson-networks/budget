import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { AccountType } from "../../../connectRPC/types.js";
import {
  type CreateManualAccountInput,
  useCreateManualAccount,
} from "../../../hooks/useAccounts.js";
import { AccountKind } from "../../../models";

export function useCreateManualAccountForm(open: boolean, onClose: () => void) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(String(AccountKind.Cash));
  const [subType, setSubType] = useState("");
  const [startingBalance, setStartingBalance] = useState("");

  const createAccount = useCreateManualAccount();

  useEffect(() => {
    if (!open) {
      createAccount.reset();
    }
  }, [open, createAccount]);

  const handleClose = useCallback(() => {
    setName("");
    setType(String(AccountKind.Cash));
    setSubType("");
    setStartingBalance("");
    createAccount.reset();
    onClose();
  }, [createAccount, onClose]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (type === null) return;
      if (!name.trim() || !subType.trim() || !startingBalance.trim()) return;

      const body: CreateManualAccountInput = {
        name: name.trim(),
        type: Number(type) as AccountType,
        subType: subType.trim(),
        startingBalance: startingBalance.trim(),
      };

      createAccount.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [createAccount, handleClose, name, startingBalance, subType, type],
  );

  const isFormValid =
    !!name.trim() &&
    type !== null &&
    !!subType.trim() &&
    !!startingBalance.trim();

  return {
    name,
    setName,
    type,
    setType,
    subType,
    setSubType,
    startingBalance,
    setStartingBalance,
    createAccount,
    handleClose,
    handleSubmit,
    isFormValid,
  };
}
