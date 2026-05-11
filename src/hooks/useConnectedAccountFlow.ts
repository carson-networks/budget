import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { useExchangePlaidToken } from "./useAccounts.js";
import { exchangeTokenRequestFromPlaidSuccess } from "./plaidWire.js";
import {
  plaidLinkTokenQueryKey,
  plaidLinkTokenQueryOptions,
} from "./usePlaidLinkToken.js";

/**
 * Plaid Link + exchange-token flow. Call {@link startLink} to open Link (e.g. from the accounts menu).
 * {@link onExchangeSuccess} runs after the server accepts the exchange (e.g. navigate to `/accounts`).
 *
 * Link tokens are fetched via TanStack Query so {@link prefetchPlaidLinkToken} can warm the cache on Accounts.
 */
export function useConnectedAccountFlow(onExchangeSuccess: () => void) {
  const queryClient = useQueryClient();
  const exchangeMutation = useExchangePlaidToken();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const openedForTokenRef = useRef<string | null>(null);
  const [lastTokenError, setLastTokenError] = useState<string | null>(null);
  const [startLinkPending, setStartLinkPending] = useState(false);

  const onPlaidSuccess = useCallback(
    (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const req = exchangeTokenRequestFromPlaidSuccess(publicToken, metadata);
      exchangeMutation.mutate(req, {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: plaidLinkTokenQueryKey,
          });
          setLinkToken(null);
          openedForTokenRef.current = null;
          onExchangeSuccess();
        },
      });
    },
    [exchangeMutation, onExchangeSuccess, queryClient],
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
    setLastTokenError(null);
    setStartLinkPending(true);
    try {
      const token = await queryClient.fetchQuery(plaidLinkTokenQueryOptions());
      setLinkToken(token);
    } catch (e) {
      setLastTokenError(e instanceof Error ? e.message : String(e));
    } finally {
      setStartLinkPending(false);
    }
  }, [queryClient]);

  const tokenError = lastTokenError;
  const exchangeError =
    exchangeMutation.isError && exchangeMutation.error
      ? exchangeMutation.error.message
      : null;

  const preparingLink = startLinkPending;
  const exchanging = exchangeMutation.isPending;
  const plaidSessionActive = linkToken !== null;

  return {
    startLink,
    preparingLink,
    exchanging,
    plaidSessionActive,
    tokenError,
    exchangeError,
    dismissTokenError: () => setLastTokenError(null),
    dismissExchangeError: () => exchangeMutation.reset(),
  };
}
