import { describe, expect, it } from "vitest";
import { CategoryKind } from "../../../models";
import {
  MatrixValueMode,
  formatMatrixValue,
  matrixCellNumber,
  totalForMode,
} from "./budgetMatrix.js";

describe("matrix values", () => {
  it.each([
    [MatrixValueMode.Budgeted, CategoryKind.Expense, "400", -320, 400],
    [MatrixValueMode.Actual, CategoryKind.Expense, "400", -320, -320],
    [MatrixValueMode.Net, CategoryKind.Expense, "400", -320, 80],
    [MatrixValueMode.Net, CategoryKind.Income, "5000", 5100, 100],
    [MatrixValueMode.Net, CategoryKind.Unspecified, "400", -450, -50],
    [MatrixValueMode.Net, CategoryKind.Expense, undefined, -10, -10],
    [MatrixValueMode.Net, CategoryKind.Income, "100", undefined, -100],
    [
      MatrixValueMode.Net,
      CategoryKind.Expense,
      undefined,
      undefined,
      undefined,
    ],
    [MatrixValueMode.Actual, CategoryKind.Expense, "400", undefined, undefined],
    [MatrixValueMode.Budgeted, CategoryKind.Expense, "invalid", 0, undefined],
    [MatrixValueMode.Budgeted, CategoryKind.Expense, "0", undefined, 0],
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
    expect(totalForMode(summary, MatrixValueMode.Budgeted)).toBe(4600);
    expect(totalForMode(summary, MatrixValueMode.Actual)).toBe(4780);
    expect(totalForMode(summary, MatrixValueMode.Net)).toBe(180);
    expect(formatMatrixValue(-1234.56)).toBe("-$1,235");
  });
});
