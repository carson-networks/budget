import { createJSONStorage, type StateStorage } from "zustand/middleware";
import type { ShellPersistedState } from "./types.js";

const browserLocalStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(name);
    }
  },
};

export const shellPersistJSONStorage = createJSONStorage<ShellPersistedState>(
  () => browserLocalStorage,
);
