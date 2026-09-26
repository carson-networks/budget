import { describe, expect, it } from "vitest";
import {
  balanceAfterStartingChange,
  formatCurrency,
  formatSignedCurrency,
  truncateToTwoDecimals,
} from "./money.js";

describe("formatCurrency", () => {
  it("formats a valid decimal string as USD", () => {
    expect(formatCurrency("1234.5")).toMatch(/1,234\.50/);
  });

  it("returns the input when it is not a finite number", () => {
    expect(formatCurrency("n/a")).toBe("n/a");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes an explicit plus for positive amounts", () => {
    expect(formatSignedCurrency("12.34")).toMatch(/^\+.*12\.34/);
  });

  it("shows negatives as unsigned magnitude (no minus)", () => {
    expect(formatSignedCurrency("-12.34")).toMatch(/12\.34/);
    expect(formatSignedCurrency("-12.34")).not.toMatch(/[+-]/);
  });

  it("leaves zero unsigned", () => {
    expect(formatSignedCurrency("0")).toMatch(/0\.00/);
    expect(formatSignedCurrency("0")).not.toMatch(/[+-]/);
  });

  it("returns the input when it is not a finite number", () => {
    expect(formatSignedCurrency("n/a")).toBe("n/a");
  });
});

describe("truncateToTwoDecimals", () => {
  it("truncates digits beyond two decimal places", () => {
    expect(truncateToTwoDecimals("25.559")).toBe("25.55");
    expect(truncateToTwoDecimals("-10.999")).toBe("-10.99");
  });

  it("leaves shorter or non-decimal input unchanged", () => {
    expect(truncateToTwoDecimals("25.5")).toBe("25.5");
    expect(truncateToTwoDecimals("25.")).toBe("25.");
    expect(truncateToTwoDecimals("25")).toBe("25");
    expect(truncateToTwoDecimals("")).toBe("");
  });
});

describe("balanceAfterStartingChange", () => {
  it("returns the same balance when starting balance is unchanged", () => {
    expect(balanceAfterStartingChange("100.00", "50.00", "50.00")).toBe(
      "100.00",
    );
  });

  it("adds the starting-balance delta to the current balance", () => {
    expect(balanceAfterStartingChange("100.00", "50.00", "75.00")).toBe(
      "125.00",
    );
  });

  it("subtracts when starting balance decreases", () => {
    expect(balanceAfterStartingChange("100.00", "50.00", "25.00")).toBe(
      "75.00",
    );
  });

  it("returns the current balance when any value is non-finite", () => {
    expect(balanceAfterStartingChange("n/a", "50.00", "75.00")).toBe("n/a");
  });
});
