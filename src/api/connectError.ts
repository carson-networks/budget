import { ConnectError } from "@connectrpc/connect";

export function connectErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConnectError) {
    return err.rawMessage || err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
