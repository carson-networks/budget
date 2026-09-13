import { useMutation, useQueryClient } from "@tanstack/react-query";
import { plaidClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import { toExchangeTokenRequestWire } from "./exchangeTokenRequestWire.js";
import type { ExchangeTokenInput } from "./types.js";

export function useExchangePlaidToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ExchangeTokenInput) => {
      try {
        await plaidClient.exchangeToken(toExchangeTokenRequestWire(body));
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
