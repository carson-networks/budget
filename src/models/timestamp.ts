import { timestampDate } from "@bufbuild/protobuf/wkt";

export function optionalDateFromTimestamp(
  ts: Parameters<typeof timestampDate>[0] | undefined,
): Date | undefined {
  return ts === undefined ? undefined : timestampDate(ts);
}
