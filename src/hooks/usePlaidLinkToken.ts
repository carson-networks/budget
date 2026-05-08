import { useMutation } from "@tanstack/react-query";
import { plaidClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";

export function usePlaidLinkToken() {
  return useMutation({
    mutationFn: async () => {
      try {
        const res = await plaidClient.createLinkToken({});
        return res.linkToken;
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
  });
}
