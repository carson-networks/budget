import { create } from "zustand";
import { combine, persist } from "zustand/middleware";
import { createShellStorePersistOptions } from "./shellPersistOptions.js";
import type { ColorSchemePreference } from "../../persistence/shell/types.js";

type ShellState = {
  sidebarOpen: boolean;
  colorSchemePreference: ColorSchemePreference;
};

type ShellActions =  {
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setColorSchemePreference: (preference: ColorSchemePreference) => void;
};

type ShellStore = ShellState & ShellActions

const shellInitialState: ShellState = {
  sidebarOpen: false,
  colorSchemePreference: "auto",
};

export const useShellStore = create<ShellStore>()(
  persist(
    combine(shellInitialState, (set) => ({
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setColorSchemePreference: (colorSchemePreference) =>
        set({ colorSchemePreference }),
    })),
    createShellStorePersistOptions<ShellStore>(),
  ),
);

export function preferenceToRootColorSchemeProps(preference: ColorSchemePreference) {
  if (preference === "auto") {
    return { defaultColorScheme: "auto" as const };
  }
  return { forceColorScheme: preference };
}
