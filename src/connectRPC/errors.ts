/**
 * User-facing message for failed ConnectRPC calls. Uses the Error when present;
 * does not import generated Connect types so hooks stay on the connectRPC surface.
 */
export function connectErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
