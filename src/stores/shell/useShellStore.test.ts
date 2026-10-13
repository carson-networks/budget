import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useShellStore } from "./useShellStore.js";

describe("useShellStore", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
  });

  afterEach(async () => {
    await useShellStore.persist.clearStorage();
  });

  it("defaults sidebarOpen to false", () => {
    expect(useShellStore.getState().sidebarOpen).toBe(false);
  });

  it("defaults colorSchemePreference to auto after clear + rehydrate", () => {
    expect(useShellStore.getState().colorSchemePreference).toBe("auto");
  });

  it("toggleSidebar flips sidebarOpen", () => {
    expect(useShellStore.getState().sidebarOpen).toBe(false);
    useShellStore.getState().toggleSidebar();
    expect(useShellStore.getState().sidebarOpen).toBe(true);
    useShellStore.getState().toggleSidebar();
    expect(useShellStore.getState().sidebarOpen).toBe(false);
  });

  it("setSidebarOpen sets an explicit value", () => {
    useShellStore.getState().setSidebarOpen(false);
    expect(useShellStore.getState().sidebarOpen).toBe(false);
    useShellStore.getState().setSidebarOpen(true);
    expect(useShellStore.getState().sidebarOpen).toBe(true);
  });

  it("setColorSchemePreference updates colorSchemePreference", () => {
    useShellStore.getState().setColorSchemePreference("light");
    expect(useShellStore.getState().colorSchemePreference).toBe("light");
  });
});
