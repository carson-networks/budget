import { describe, expect, it } from "vitest";
import { formatAmount, formatCurrency } from "./money.js";

describe("formatCurrency", () => {
  it("formats a valid decimal string as USD", () => {
    expect(formatCurrency("1234.5")).toMatch(/1,234\.50/);
  });

  it("returns the input when it is not a finite number", () => {
    expect(formatCurrency("n/a")).toBe("n/a");
  });
});

describe("formatAmount", () => {
  it("formats a valid decimal string without a currency symbol", () => {
    expect(formatAmount("1234.5")).toBe("1,234.50");
  });

  it("returns the input when it is not a finite number", () => {
    expect(formatAmount("n/a")).toBe("n/a");
  });
});
