import { describe, expect, it } from "vitest";
import { AccountType, type SyncAccount as WireSyncAccount } from "../network/types.js";
import { AccountKind } from "./account.js";
import { mapPlaidSyncAccount } from "./plaid.js";

describe("mapPlaidSyncAccount", () => {
  it("maps sync account fields", () => {
    const wire: WireSyncAccount = {
      $typeName: "plaid.v1.SyncAccount",
      $unknown: undefined,
      plaidAccountId: "pa1",
      name: "Plaid Checking",
      type: AccountType.CASH,
      subType: "checking",
      balance: "500",
    };

    expect(mapPlaidSyncAccount(wire)).toEqual({
      plaidAccountId: "pa1",
      name: "Plaid Checking",
      accountKind: AccountKind.Cash,
      subType: "checking",
      balance: "500",
    });
  });
});
