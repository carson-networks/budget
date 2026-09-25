import { describe, expect, it } from "vitest";
import { AccountIntegration, AccountKind } from "../../../models";
import type { Account } from "../../../models";
import { groupAccountsByKind } from "./accountSegments.js";

function makeAccount(
  partial: Partial<Account> & Pick<Account, "id" | "name" | "accountKind">,
): Account {
  return {
    subType: "Checking",
    balance: "0",
    startingBalance: "0",
    integration: AccountIntegration.Manual,
    ...partial,
  };
}

describe("groupAccountsByKind", () => {
  it("orders segments Cash, Credit Cards, Unspecified and sorts names", () => {
    const input: Account[] = [
      makeAccount({
        id: "c",
        name: "B",
        accountKind: AccountKind.Cash,
      }),
      makeAccount({
        id: "d",
        name: "A",
        accountKind: AccountKind.Cash,
      }),
      makeAccount({
        id: "a",
        name: "Z",
        accountKind: AccountKind.CreditCards,
      }),
      makeAccount({
        id: "b",
        name: "Y",
        accountKind: AccountKind.Unspecified,
      }),
    ];
    const segments = groupAccountsByKind(input);
    expect(segments.map((s) => s.kind)).toEqual([
      AccountKind.Cash,
      AccountKind.CreditCards,
      AccountKind.Unspecified,
    ]);
    expect(segments[0].accounts.map((a) => a.name)).toEqual(["A", "B"]);
    expect(segments[1].accounts.map((a) => a.name)).toEqual(["Z"]);
    expect(segments[2].accounts.map((a) => a.name)).toEqual(["Y"]);
  });

  it("omits empty kinds", () => {
    const segments = groupAccountsByKind([
      makeAccount({
        id: "1",
        name: "Only",
        accountKind: AccountKind.Cash,
      }),
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe(AccountKind.Cash);
  });
});
