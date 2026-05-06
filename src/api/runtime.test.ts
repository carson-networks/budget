import { afterEach, describe, expect, it } from "vitest";
import { isFakeDataMode } from "./runtime.js";

describe("isFakeDataMode", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("is false with no search params", () => {
    window.history.replaceState({}, "", "/");
    expect(isFakeDataMode()).toBe(false);
  });

  it("is true when mock=true", () => {
    window.history.replaceState({}, "", "/?mock=true");
    expect(isFakeDataMode()).toBe(true);
  });

  it("is false when mock is not the string true", () => {
    window.history.replaceState({}, "", "/?mock=1");
    expect(isFakeDataMode()).toBe(false);
  });
});
