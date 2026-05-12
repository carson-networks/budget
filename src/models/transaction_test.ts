import { describe, expect, it } from "vitest";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import type {
  GetTransactionTotalsResponse,
  Transaction as WireTransaction,
} from "../connectRPC/types";
import {
  mapGetTransactionTotalsResponse,
  mapTransaction,
  mapTransactionTotalsCategory,
} from "./transaction.js";

describe("mapTransaction", () => {
  it("maps wire transaction fields", () => {
    const txDate = new Date("2025-01-10T08:00:00.000Z");
    const wire: WireTransaction = {
      $typeName: "transaction.v1.Transaction",
      $unknown: undefined,
      id: "t1",
      accountId: "a1",
      categoryId: "c1",
      amount: "-15.99",
      transactionName: "Coffee",
      transactionDate: timestampFromDate(txDate),
      createdAt: undefined,
    };

    expect(mapTransaction(wire)).toEqual({
      id: "t1",
      accountId: "a1",
      categoryId: "c1",
      amount: "-15.99",
      transactionName: "Coffee",
      transactionDate: txDate,
      createdAt: undefined,
    });
  });
});

describe("transaction totals mappers", () => {
  it("mapTransactionTotalsCategory maps rows", () => {
    expect(
      mapTransactionTotalsCategory({
        $typeName: "transaction.v1.TransactionTotalsCategory",
        $unknown: undefined,
        categoryId: "c1",
        total: "100",
      }),
    ).toEqual({ categoryId: "c1", total: "100" });
  });

  it("mapGetTransactionTotalsResponse nests months", () => {
    const wire: GetTransactionTotalsResponse = {
      $typeName: "transaction.v1.GetTransactionTotalsResponse",
      $unknown: undefined,
      byMonth: [
        {
          $typeName: "transaction.v1.TransactionTotalsMonth",
          $unknown: undefined,
          year: 2025,
          month: 4,
          byCategory: [
            {
              $typeName: "transaction.v1.TransactionTotalsCategory",
              $unknown: undefined,
              categoryId: "c1",
              total: "50",
            },
          ],
        },
      ],
    };

    expect(mapGetTransactionTotalsResponse(wire)).toEqual({
      byMonth: [
        {
          year: 2025,
          month: 4,
          byCategory: [{ categoryId: "c1", total: "50" }],
        },
      ],
    });
  });
});
