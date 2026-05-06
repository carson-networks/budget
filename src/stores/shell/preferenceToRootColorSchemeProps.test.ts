import { describe, expect, it } from "vitest";
import { preferenceToRootColorSchemeProps } from "./useShellStore.js";

describe("preferenceToRootColorSchemeProps", () => {
  it("maps auto to Mantine auto default", () => {
    expect(preferenceToRootColorSchemeProps("auto")).toEqual({
      defaultColorScheme: "auto",
    });
  });

  it("maps light and dark to Mantine force", () => {
    expect(preferenceToRootColorSchemeProps("light")).toEqual({
      forceColorScheme: "light",
    });
    expect(preferenceToRootColorSchemeProps("dark")).toEqual({
      forceColorScheme: "dark",
    });
  });
});
