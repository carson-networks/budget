import type { PersistOptions } from "zustand/middleware";
import { shellPersistJSONStorage } from "../../persistence/shell/storage.js";
import type { ShellPersistedState } from "../../persistence/shell/types.js";

export const SHELL_PERSIST_STORAGE_KEY = "budget.color-scheme-preference";

export function createShellStorePersistOptions<
  T extends ShellPersistedState,
>(): PersistOptions<T, ShellPersistedState> {
  return {
    name: SHELL_PERSIST_STORAGE_KEY,
    storage: shellPersistJSONStorage,
    partialize: (state: T): ShellPersistedState => ({
      colorSchemePreference: state.colorSchemePreference,
    }),
  };
}
