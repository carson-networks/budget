import { useState, useEffect, useCallback, useRef } from "react";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import {
  useCreateAccount,
  AccountType,
  type CreateAccountInput,
} from "../../hooks/useAccounts";
import {
  ACCOUNT_SYNC_OPTIONS,
  PLAID_ACCOUNT_SUB_TYPE,
  type AccountSyncProviderId,
} from "../../constants/accountSyncIntegrations";

function buildPlaidAccountBody(
  nameInput: string,
  metadata: PlaidLinkOnSuccessMetadata,
): CreateAccountInput {
  const resolvedName =
    nameInput.trim() ||
    metadata.accounts[0]?.name ||
    metadata.institution?.name ||
    "Linked account";
  return {
    name: resolvedName,
    type: AccountType.CASH,
    subType: PLAID_ACCOUNT_SUB_TYPE,
    startingBalance: "0",
    sync: { provider: "plaid", plaidLinkCompleted: true },
  };
}

export function useCreateAccountForm(open: boolean, onClose: () => void) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(String(AccountType.CASH));
  const [subType, setSubType] = useState("");
  const [startingBalance, setStartingBalance] = useState("");
  const [syncProvider, setSyncProvider] =
    useState<AccountSyncProviderId>("manual");
  const [plaidLinkCompleted, setPlaidLinkCompleted] = useState(false);
  const lastPlaidMetadataRef = useRef<PlaidLinkOnSuccessMetadata | null>(null);

  const createAccount = useCreateAccount();

  useEffect(() => {
    if (!open) createAccount.reset();
  }, [open, createAccount]);

  const handleClose = useCallback(() => {
    setName("");
    setType(String(AccountType.CASH));
    setSubType("");
    setStartingBalance("");
    setSyncProvider("manual");
    setPlaidLinkCompleted(false);
    lastPlaidMetadataRef.current = null;
    createAccount.reset();
    onClose();
  }, [onClose, createAccount]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (syncProvider === "manual") {
        if (type === null) return;
        if (!name.trim() || !subType || !startingBalance) return;

        const manualType = Number(type) as AccountType;
        const body: CreateAccountInput = {
          name: name.trim(),
          type: manualType,
          subType,
          startingBalance,
          sync: { provider: "manual" },
        };

        createAccount.mutate(body, {
          onSuccess: () => {
            handleClose();
          },
        });
        return;
      }

      const meta = lastPlaidMetadataRef.current;
      if (!meta || !plaidLinkCompleted) return;

      const body = buildPlaidAccountBody(name, meta);
      createAccount.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [
      createAccount,
      handleClose,
      name,
      plaidLinkCompleted,
      startingBalance,
      subType,
      syncProvider,
      type,
    ],
  );

  const handlePlaidLinked = useCallback(
    (_publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      lastPlaidMetadataRef.current = metadata;
      setPlaidLinkCompleted(true);

      const body = buildPlaidAccountBody(name, metadata);
      if (!name.trim()) {
        setName(body.name);
      }

      createAccount.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [name, createAccount, handleClose],
  );

  const setSyncProviderAndClearPlaid = useCallback(
    (v: string | null) => {
      const next = (v ?? "manual") as AccountSyncProviderId;
      setSyncProvider(next);
      if (next !== "plaid") {
        setPlaidLinkCompleted(false);
        lastPlaidMetadataRef.current = null;
      }
    },
    [],
  );

  const isManualFormValid =
    !!name.trim() && type !== null && !!subType && !!startingBalance;

  const showCreateAccountButton =
    syncProvider === "manual" ||
    (syncProvider === "plaid" && createAccount.isError && plaidLinkCompleted);

  const selectedSyncMeta = ACCOUNT_SYNC_OPTIONS.find((o) => o.id === syncProvider);
  const showManualAccountFields = syncProvider === "manual";

  return {
    name,
    setName,
    type,
    setType,
    subType,
    setSubType,
    startingBalance,
    setStartingBalance,
    syncProvider,
    setSyncProvider: setSyncProviderAndClearPlaid,
    plaidLinkCompleted,
    createAccount,
    handleClose,
    handleSubmit,
    handlePlaidLinked,
    isManualFormValid,
    showCreateAccountButton,
    selectedSyncMeta,
    showManualAccountFields,
  };
}
