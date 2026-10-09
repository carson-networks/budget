import { mutationOptions, useMutation } from "@tanstack/react-query";
import { plaidClient } from "../connectRPC/connect.js";
import { invalidatesOnSettled } from "../queries/invalidate.js";
import { accountQueries } from "../queries/accounts.js";
import { rpc } from "../queries/rpc.js";
import { toExchangeTokenRequestWire } from "./exchangeTokenRequestWire.js";
import type { ExchangeTokenInput } from "./types.js";

export const exchangePlaidTokenMutation = mutationOptions({
  mutationKey: ["plaid", "exchangeToken"],
  mutationFn: (body: ExchangeTokenInput) =>
    rpc(plaidClient.exchangeToken(toExchangeTokenRequestWire(body))),
  ...invalidatesOnSettled(accountQueries.all()),
});

export function useExchangePlaidToken() {
  return useMutation(exchangePlaidTokenMutation);
}
