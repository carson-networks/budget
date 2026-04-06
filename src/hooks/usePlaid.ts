import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountClient, plaidClient } from "../api/connect";
import { connectErrorMessage } from "../api/connectError";
import type { MessageInitShape } from "@bufbuild/protobuf";
import {
  ExchangeTokenRequestSchema,
  SyncAccountSchema,
} from "../gen/plaid/v1/plaid_pb.js";

export type PlaidSyncAccount = MessageInitShape<typeof SyncAccountSchema>;
export type ExchangeTokenInput = MessageInitShape<typeof ExchangeTokenRequestSchema>;

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: async () => {
      try {
        const res = await plaidClient.createLinkToken({});
        return res.linkToken;
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to create link token"));
      }
    },
  });
}

export function useExchangePlaidToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ExchangeTokenInput) => {
      try {
        await plaidClient.exchangeToken(body);
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to exchange Plaid token"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useSyncAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountIds?: string[]) => {
      try {
        return await accountClient.syncAccounts({
          accountIds: accountIds ?? [],
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to sync accounts"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
