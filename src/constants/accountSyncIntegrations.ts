/**
 * Registry of account sync integrations. Only configurable in the create-account flow.
 * Add entries here when new providers ship; the create modal renders from this list.
 */
export type AccountSyncProviderId = "manual" | "plaid";

/** Stored as `Account.sub_type` for Plaid-linked rows until the API adds a dedicated sync field. */
export const PLAID_ACCOUNT_SUB_TYPE = "Plaid";

export type AccountSyncSelection =
  | { provider: "manual" }
  | {
      provider: "plaid";
      /** True after the user completes Plaid Link (or the demo shortcut). */
      plaidLinkCompleted: boolean;
    };

export type AccountSyncOptionMeta = {
  id: AccountSyncProviderId;
  label: string;
  description: string;
  /** Copy shown when this option is selected */
  selectedHelp: string;
  /** If false, option is visible but not yet available */
  available: boolean;
};

export const ACCOUNT_SYNC_OPTIONS: readonly AccountSyncOptionMeta[] = [
  {
    id: "manual",
    label: "Manual",
    description: "",
    selectedHelp: "",
    available: true,
  },
  {
    id: "plaid",
    label: "Plaid",
    description: "Connect a bank and import transactions.",
    selectedHelp:
      "You’ll sign in with your bank through Plaid’s secure flow. This account will stay tied to that connection. Other providers may appear here later.",
    available: true,
  },
];
