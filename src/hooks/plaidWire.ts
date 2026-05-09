import { create } from "@bufbuild/protobuf";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import {
  AccountType,
  ExchangeTokenRequestSchema,
  SyncAccountSchema,
  type ExchangeTokenRequest,
} from "../connectRPC/types.js";

function plaidProductTypeToAccountType(plaidType: string): AccountType {
  const t = plaidType.toLowerCase();
  if (t === "credit") {
    return AccountType.CREDIT_CARDS;
  }
  return AccountType.CASH;
}

/** Maps Plaid Link success metadata to the ConnectRPC exchange-token request. */
export function exchangeTokenRequestFromPlaidSuccess(
  publicToken: string,
  metadata: PlaidLinkOnSuccessMetadata,
): ExchangeTokenRequest {
  const accounts = (metadata.accounts ?? []).map((a) =>
    create(SyncAccountSchema, {
      plaidAccountId: a.id,
      name: a.name || "Linked account",
      type: plaidProductTypeToAccountType(a.type),
      subType: (a.subtype || a.type || "account").trim(),
      balance: "0",
    }),
  );

  return create(ExchangeTokenRequestSchema, {
    publicToken,
    institutionId: metadata.institution?.institution_id ?? "",
    institutionName: metadata.institution?.name ?? "",
    accounts,
  });
}
