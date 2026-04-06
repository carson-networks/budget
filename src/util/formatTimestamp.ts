import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { timestampDate } from "@bufbuild/protobuf/wkt";

export function formatTimestamp(ts: Timestamp | undefined): string {
  if (!ts) {
    return "—";
  }
  try {
    return timestampDate(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}
