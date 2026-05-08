/**
 * Stored at the start of `Account.sub_type` for accounts created via Plaid
 * exchange. The remainder is the Plaid product subtype (e.g. checking).
 */
export const PLAID_LINKED_SUBTYPE_PREFIX = "plaid:";

/** Legacy single-value marker used by older flows. */
const LEGACY_PLAID_SUB_TYPE_MARKER = "Plaid";

export function encodePlaidLinkedSubType(plaidSubtypeOrType: string): string {
  const trimmed = plaidSubtypeOrType.trim().replace(/^plaid:/i, "");
  return `${PLAID_LINKED_SUBTYPE_PREFIX}${trimmed || "account"}`;
}

export function isPlaidLinkedStoredSubType(subType: string): boolean {
  const s = subType.trim();
  if (s === LEGACY_PLAID_SUB_TYPE_MARKER) {
    return true;
  }
  return s.toLowerCase().startsWith(PLAID_LINKED_SUBTYPE_PREFIX.toLowerCase());
}

/** Human-readable subtype for table cells (strips Plaid encoding). */
export function displaySubTypeFromStored(subType: string): string {
  const lowerPrefix = PLAID_LINKED_SUBTYPE_PREFIX.toLowerCase();
  const s = subType.trim();
  if (s.toLowerCase().startsWith(lowerPrefix)) {
    const rest = s.slice(PLAID_LINKED_SUBTYPE_PREFIX.length);
    return rest || "—";
  }
  return s;
}
