import { describe, expect, it } from "vitest";
import type { Budget as WireBudget } from "../network/types.js";
import { mapBudget } from "./budget.js";

describe("mapBudget", () => {
  it("maps wire budget fields", () => {
    const wire: WireBudget = {
      $typeName: "budget.v1.Budget",
      $unknown: undefined,
      categoryId: "cat1",
      month: 3,
      year: 2025,
      amount: "42.00",
    };

    expect(mapBudget(wire)).toEqual({
      categoryId: "cat1",
      month: 3,
      year: 2025,
      amount: "42.00",
    });
  });
});
