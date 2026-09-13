import type { QueryClient } from "@tanstack/react-query";
import { plaidClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";

/** TanStack Query cache key for Plaid Link token (createLinkToken RPC). */
export const plaidLinkTokenQueryKey = ["plaidLinkToken"] as const;

/**
 * Link tokens are valid for hours; keep cache fresh enough for prefetch without holding stale data forever.
 */
const STALE_MS = 1000 * 60 * 30; // 30 minutes

export async function fetchPlaidLinkToken(): Promise<string> {
  try {
    const res = await plaidClient.createLinkToken({});
    return res.linkToken;
  } catch (e) {
    throw new Error(connectErrorMessage(e));
  }
}

/** Shared options for prefetch + connect flow (same cache entry). */
export function plaidLinkTokenQueryOptions() {
  return {
    queryKey: plaidLinkTokenQueryKey,
    queryFn: fetchPlaidLinkToken,
    staleTime: STALE_MS,
    gcTime: 1000 * 60 * 60,
  };
}

/** Warm the link-token cache while on Accounts (speeds up opening Plaid). */
export function prefetchPlaidLinkToken(queryClient: QueryClient): void {
  void queryClient.prefetchQuery(plaidLinkTokenQueryOptions());
}
