import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import type { InfiniteData } from "@tanstack/react-query";
import {
  AccountSchema,
  AccountType,
  ListAccountsResponseSchema,
  type ListAccountsResponse,
} from "../connectRPC/types.js";
import {
  prependToInfiniteList,
  removeFromInfiniteList,
  updateInInfiniteList,
} from "./cachePatches.js";

const wireA = create(AccountSchema, {
  id: "a",
  name: "A",
  type: AccountType.CASH,
  subType: "Checking",
  balance: "1",
  startingBalance: "1",
});

const wireB = create(AccountSchema, {
  id: "b",
  name: "B",
  type: AccountType.CASH,
  subType: "Savings",
  balance: "2",
  startingBalance: "2",
});

describe("cachePatches", () => {
  it("prependToInfiniteList inserts at the front of the first page", () => {
    const old: InfiniteData<ListAccountsResponse> = {
      pages: [
        create(ListAccountsResponseSchema, {
          accounts: [wireA],
          nextCursor: undefined,
        }),
      ],
      pageParams: [undefined],
    };
    const next = prependToInfiniteList(old, wireB);
    expect(next.pages[0].accounts.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("removeFromInfiniteList drops matching rows across pages", () => {
    const old: InfiniteData<ListAccountsResponse> = {
      pages: [
        create(ListAccountsResponseSchema, {
          accounts: [wireA],
          nextCursor: undefined,
        }),
        create(ListAccountsResponseSchema, {
          accounts: [wireB],
          nextCursor: undefined,
        }),
      ],
      pageParams: [undefined, undefined],
    };
    const next = removeFromInfiniteList(old, (a) => a.id === "b");
    expect(next?.pages.flatMap((p) => p.accounts.map((x) => x.id))).toEqual([
      "a",
    ]);
  });

  it("updateInInfiniteList replaces matching rows", () => {
    const old: InfiniteData<ListAccountsResponse> = {
      pages: [
        create(ListAccountsResponseSchema, {
          accounts: [wireA, wireB],
          nextCursor: undefined,
        }),
      ],
      pageParams: [undefined],
    };
    const replaced = create(AccountSchema, {
      ...wireA,
      name: "Renamed",
    });
    const next = updateInInfiniteList(old, (a) => a.id === "a", replaced);
    expect(next?.pages[0].accounts[0].name).toBe("Renamed");
    expect(next?.pages[0].accounts[1].id).toBe("b");
  });
});
