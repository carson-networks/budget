import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { useExchangePlaidToken } from "../../../hooks/useAccounts.js";
import { exchangeTokenRequestFromPlaidSuccess } from "../../../hooks/plaidWire.js";
import { usePlaidLinkToken } from "../../../hooks/usePlaidLinkToken.js";

export function useConnectedAccountFlow(onClose: () => void) {
  const linkTokenMutation = usePlaidLinkToken();
  const exchangeMutation = useExchangePlaidToken();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const openedForTokenRef = useRef<string | null>(null);

  const onPlaidSuccess = useCallback(
    (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const req = exchangeTokenRequestFromPlaidSuccess(publicToken, metadata);
      exchangeMutation.mutate(req, {
        onSuccess: () => {
          setLinkToken(null);
          openedForTokenRef.current = null;
          onClose();
        },
      });
    },
    [exchangeMutation, onClose],
  );

  const { open: openPlaidLink, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      setLinkToken(null);
      openedForTokenRef.current = null;
    },
  });

  useEffect(() => {
    if (!linkToken || !ready) {
      return;
    }
    if (openedForTokenRef.current === linkToken) {
      return;
    }
    openedForTokenRef.current = linkToken;
    openPlaidLink();
  }, [linkToken, ready, openPlaidLink]);

  const startLink = useCallback(async () => {
    try {
      const token = await linkTokenMutation.mutateAsync();
      setLinkToken(token);
    } catch {
      /* surfaced via linkTokenMutation.isError */
    }
  }, [linkTokenMutation]);

  const tokenError =
    linkTokenMutation.isError && linkTokenMutation.error
      ? linkTokenMutation.error.message
      : null;
  const exchangeError =
    exchangeMutation.isError && exchangeMutation.error
      ? exchangeMutation.error.message
      : null;

  const preparingLink = linkTokenMutation.isPending;
  const exchanging = exchangeMutation.isPending;
  const plaidSessionActive = linkToken !== null;

  return {
    startLink,
    preparingLink,
    exchanging,
    plaidSessionActive,
    tokenError,
    exchangeError,
    dismissTokenError: () => linkTokenMutation.reset(),
    dismissExchangeError: () => exchangeMutation.reset(),
  };
}
