import { describe, expect, it } from "vitest";
import { AccountType } from "../connectRPC/types";
import { AccountKind } from "../models/account.js";
import type { ExchangeTokenInput } from "./types.js";
import { toExchangeTokenRequestWire } from "./exchangeTokenRequestWire.js";

describe("toExchangeTokenRequestWire", () => {
  it("maps domain exchange input to the ConnectRPC request", () => {
    const input: ExchangeTokenInput = {
      publicToken: "t",
      institutionId: "i",
      institutionName: "n",
      accounts: [
        {
          plaidAccountId: "p",
          name: "Card",
          accountKind: AccountKind.CreditCards,
          subType: "credit card",
          balance: "0",
        },
      ],
    };
    const wire = toExchangeTokenRequestWire(input);
    const a = wire.accounts[0];
    const d = input.accounts[0];
    expect(a.type).toBe(AccountType.CREDIT_CARDS);
    expect(a.plaidAccountId).toBe(d.plaidAccountId);
    expect(a.name).toBe(d.name);
    expect(a.subType).toBe(d.subType);
    expect(a.balance).toBe(d.balance);
  });
});
