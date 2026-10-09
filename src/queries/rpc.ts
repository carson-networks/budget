import { connectErrorMessage } from "../connectRPC/errors.js";

/** Awaits a ConnectRPC call, rethrowing failures as plain `Error`s with a UI-safe message. */
export async function rpc<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (e) {
    throw new Error(connectErrorMessage(e));
  }
}
