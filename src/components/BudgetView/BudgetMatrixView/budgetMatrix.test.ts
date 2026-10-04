import { describe, expect, it } from "vitest";
import { CategoryKind } from "../../../models";
import {
  formatMatrixValue,
  matrixCellNumber,
  totalForMode,
} from "./budgetMatrix.js";

describe("matrix values", () => {
  it.each([
    ["budgeted", CategoryKind.Expense, "400", -320, 400],
    ["actual", CategoryKind.Expense, "400", -320, -320],
    ["net", CategoryKind.Expense, "400", -320, 80],
    ["net", CategoryKind.Income, "5000", 5100, 100],
    ["net", CategoryKind.Unspecified, "400", -450, -50],
    ["net", CategoryKind.Expense, undefined, -10, -10],
    ["net", CategoryKind.Income, "100", undefined, -100],
    ["net", CategoryKind.Expense, undefined, undefined, undefined],
    ["actual", CategoryKind.Expense, "400", undefined, undefined],
    ["budgeted", CategoryKind.Expense, "invalid", 0, undefined],
    ["budgeted", CategoryKind.Expense, "0", undefined, 0],
  ] as const)(
    "%s for kind %i with budget %s and actual %s",
    (mode, kind, budget, actual, expected) => {
      expect(matrixCellNumber(mode, kind, budget, actual)).toBe(expected);
    },
  );

  it("selects net totals and displays whole dollars", () => {
    const summary = {
      income: { budget: 5000, actual: 5100, difference: 100 },
      expense: { budget: 400, actual: -320, difference: 80 },
      net: { budget: 4600, actual: 4780, difference: 180 },
    };
    expect(totalForMode(summary, "budgeted")).toBe(4600);
    expect(totalForMode(summary, "actual")).toBe(4780);
    expect(totalForMode(summary, "net")).toBe(180);
    expect(formatMatrixValue(-1234.56)).toBe("-$1,235");
  });
});
