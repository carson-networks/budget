import type { Account } from "../../../models";
import {
  displaySubTypeFromStored,
  isPlaidLinkedStoredSubType,
} from "../../../models";

/** @deprecated Prefer {@link isPlaidLinkedStoredSubType} / encoding in models. */
export const PLAID_ACCOUNT_SUB_TYPE = "Plaid";

export function accountSyncLabel(account: Account): string {
  return isPlaidLinkedStoredSubType(account.subType) ? "Plaid" : "Manual";
}

/** Subtype shown in the Type column (without Plaid wire encoding). */
export function displayAccountSubType(account: Account): string {
  return displaySubTypeFromStored(account.subType);
}
