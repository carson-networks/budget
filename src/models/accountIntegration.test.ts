import { describe, expect, it } from "vitest";
import {
  PLAID_LINKED_SUBTYPE_PREFIX,
  displaySubTypeFromStored,
  encodePlaidLinkedSubType,
  isPlaidLinkedStoredSubType,
} from "./accountIntegration.js";

describe("accountIntegration", () => {
  it("encodes Plaid subtypes with a stable prefix", () => {
    expect(encodePlaidLinkedSubType("checking")).toBe(
      `${PLAID_LINKED_SUBTYPE_PREFIX}checking`,
    );
  });

  it("detects legacy and prefixed Plaid rows", () => {
    expect(isPlaidLinkedStoredSubType("Plaid")).toBe(true);
    expect(isPlaidLinkedStoredSubType("plaid:checking")).toBe(true);
    expect(isPlaidLinkedStoredSubType("Checking")).toBe(false);
  });

  it("strips prefix for display", () => {
    expect(displaySubTypeFromStored("plaid:checking")).toBe("checking");
    expect(displaySubTypeFromStored("Checking")).toBe("Checking");
  });
});
