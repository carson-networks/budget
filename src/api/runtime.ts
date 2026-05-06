export const MOCK_DATA_QUERY_PARAM = "mock";

export function isFakeDataMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const value = new URLSearchParams(window.location.search).get(
    MOCK_DATA_QUERY_PARAM,
  );
  return value === "true";
}
