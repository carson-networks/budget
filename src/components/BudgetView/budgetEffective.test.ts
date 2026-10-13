import { describe, expect, it } from "vitest";
import { effectiveBudgetForMonth } from "./budgetEffective.js";

describe("effectiveBudgetForMonth", () => {
  const sparse = [
    { categoryId: "a", year: 2025, month: 1, amount: "100" },
    { categoryId: "a", year: 2025, month: 3, amount: "150" },
    { categoryId: "b", year: 2025, month: 2, amount: "50" },
  ];

  it("carries forward the latest amount on or before the target", () => {
    expect(
      effectiveBudgetForMonth(sparse, "a", { year: 2025, month: 2 }),
    ).toBe("100");
    expect(
      effectiveBudgetForMonth(sparse, "a", { year: 2025, month: 4 }),
    ).toBe("150");
  });

  it("returns undefined when nothing exists on or before the target", () => {
    expect(
      effectiveBudgetForMonth(sparse, "b", { year: 2025, month: 1 }),
    ).toBeUndefined();
    expect(
      effectiveBudgetForMonth(sparse, "missing", { year: 2025, month: 6 }),
    ).toBeUndefined();
  });
});
