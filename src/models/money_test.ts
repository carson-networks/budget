import { describe, expect, it } from "vitest";
import { formatCurrency } from "./money.js";

describe("formatCurrency", () => {
  it("formats a valid decimal string as USD", () => {
    expect(formatCurrency("1234.5")).toMatch(/1,234\.50/);
  });

  it("returns the input when it is not a finite number", () => {
    expect(formatCurrency("n/a")).toBe("n/a");
  });
});
