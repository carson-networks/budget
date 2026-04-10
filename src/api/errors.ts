import { ConnectError } from "@connectrpc/connect";

export function connectErrorMessage(err: unknown): string {
  if (err instanceof ConnectError) {
    return err.rawMessage || err.message || "Request failed";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Request failed";
}
