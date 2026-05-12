import { create } from "@bufbuild/protobuf";
import {
  AccountType,
  ExchangeTokenRequestSchema,
  SyncAccountSchema,
  type ExchangeTokenRequest,
} from "../connectRPC/types.js";
import type { ExchangeTokenInput } from "./types.js";

export function toExchangeTokenRequestWire(
  input: ExchangeTokenInput,
): ExchangeTokenRequest {
  const accounts = input.accounts.map((a) =>
    create(SyncAccountSchema, {
      plaidAccountId: a.plaidAccountId,
      name: a.name,
      type: a.accountKind as unknown as AccountType,
      subType: a.subType,
      balance: a.balance,
    }),
  );

  return create(ExchangeTokenRequestSchema, {
    publicToken: input.publicToken,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    accounts,
  });
}
