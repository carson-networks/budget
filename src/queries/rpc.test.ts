import { describe, expect, it } from "vitest";
import { rpc } from "./rpc.js";

describe("rpc", () => {
  it("passes successful responses through", async () => {
    await expect(rpc(Promise.resolve({ ok: true }))).resolves.toEqual({
      ok: true,
    });
  });

  it("rethrows Error failures as a plain Error with the same message", async () => {
    await expect(rpc(Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });

  it("stringifies non-Error failures", async () => {
    await expect(rpc(Promise.reject("Save failed"))).rejects.toThrow(
      "Save failed",
    );
  });
});
