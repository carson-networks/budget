import type { Account } from "../../../models";
import { AccountIntegration } from "../../../models";

/** Integration column label from {@link Account.integration}. */
export function accountSyncLabel(account: Account): string {
  switch (account.integration) {
    case AccountIntegration.Plaid:
      return "Plaid";
    case AccountIntegration.Manual:
    case AccountIntegration.Unspecified:
    default:
      return "Manual";
  }
}
