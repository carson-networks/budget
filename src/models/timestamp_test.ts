import { describe, expect, it } from "vitest";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { optionalDateFromTimestamp } from "./timestamp.js";

describe("optionalDateFromTimestamp", () => {
  it("returns undefined for undefined input", () => {
    expect(optionalDateFromTimestamp(undefined)).toBeUndefined();
  });

  it("converts a protobuf Timestamp to Date", () => {
    const date = new Date("2024-06-15T12:30:00.000Z");
    const ts = timestampFromDate(date);
    const out = optionalDateFromTimestamp(ts);
    expect(out).toBeDefined();
    expect(out!.toISOString()).toBe(date.toISOString());
  });
});
