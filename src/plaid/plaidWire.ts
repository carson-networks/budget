import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { AccountKind } from "../models";
import type { ExchangeTokenInput, PlaidSyncAccount } from "./types.js";

/** One account row from Plaid Link metadata (SDK-agnostic). */
type PlaidLinkAccountRow = {
  plaidAccountId: string;
  name: string | null | undefined;
  type: string;
  subtype: string | null | undefined;
};

function plaidProductTypeToAccountKind(plaidType: string): AccountKind {
  const t = plaidType.toLowerCase();
  if (t === "credit") {
    return AccountKind.CreditCards;
  }
  return AccountKind.Cash;
}

function buildExchangeTokenInput(
  publicToken: string,
  institutionId: string,
  institutionName: string,
  linkAccounts: ReadonlyArray<PlaidLinkAccountRow>,
): ExchangeTokenInput {
  const accounts: PlaidSyncAccount[] = linkAccounts.map((a) => ({
    plaidAccountId: a.plaidAccountId,
    name: a.name?.trim() ? a.name : "Linked account",
    accountKind: plaidProductTypeToAccountKind(a.type),
    subType: (a.subtype || a.type || "account").trim(),
    balance: "0",
  }));

  return {
    publicToken,
    institutionId,
    institutionName,
    accounts,
  };
}

/** Maps Plaid Link success metadata to domain exchange input. */
export function exchangeTokenInputFromPlaidSuccess(
  publicToken: string,
  metadata: PlaidLinkOnSuccessMetadata,
): ExchangeTokenInput {
  return buildExchangeTokenInput(
    publicToken,
    metadata.institution?.institution_id ?? "",
    metadata.institution?.name ?? "",
    (metadata.accounts ?? []).map((a) => ({
      plaidAccountId: a.id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
    })),
  );
}
