import "@tanstack/react-query";

// `rpc()` always rethrows `Error`, so every query and mutation fails with one.
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: Error;
  }
}
