import { describe, expect, it } from "vitest";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { AccountType, type Account as WireAccount } from "../connectRPC/types";
import { AccountKind, mapAccount } from "./account.js";

describe("mapAccount", () => {
  it("maps wire fields to domain", () => {
    const createdAt = new Date("2020-01-01T00:00:00.000Z");
    const wire: WireAccount = {
      $typeName: "account.v1.Account",
      $unknown: undefined,
      id: "id1",
      name: "Checking",
      type: AccountType.CASH,
      subType: "checking",
      balance: "120.50",
      startingBalance: "0",
      createdAt: timestampFromDate(createdAt),
    };

    expect(mapAccount(wire)).toEqual({
      id: "id1",
      name: "Checking",
      accountKind: AccountKind.Cash,
      subType: "checking",
      balance: "120.50",
      startingBalance: "0",
      createdAt,
    });
  });
});
