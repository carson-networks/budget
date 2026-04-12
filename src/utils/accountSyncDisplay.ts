import type { Account } from "../gen/account/v1/account_pb.js";
import { PLAID_ACCOUNT_SUB_TYPE } from "../constants/accountSyncIntegrations";

/** Display label for how an account is kept in sync (until `Account` exposes a sync field from the API). */
export function accountSyncTypeLabel(account: Account): string {
  if (account.subType === PLAID_ACCOUNT_SUB_TYPE) {
    return "Plaid";
  }
  return "Manual";
}
