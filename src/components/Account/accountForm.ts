import type { AccountType } from "../../connectRPC/types.js";
import {
  AccountKind,
  type Account,
} from "../../models";
import type {
  CreateManualAccountInput,
  UpdateAccountInput,
} from "../../queries/accounts.js";

/** Field values shared by the create and edit account forms (all raw strings). */
export type AccountFormValues = {
  name: string;
  /** Select value: a stringified `AccountKind`, or null when cleared. */
  type: string | null;
  subType: string;
  startingBalance: string;
};

export function emptyAccountForm(): AccountFormValues {
  return {
    name: "",
    type: String(AccountKind.Cash),
    subType: "",
    startingBalance: "",
  };
}

export function accountFormFrom(account: Account): AccountFormValues {
  return {
    name: account.name,
    type: String(account.accountKind),
    subType: account.subType,
    startingBalance: account.startingBalance,
  };
}

export function isAccountFormValid(
  values: AccountFormValues,
  { requireType }: { requireType: boolean },
): boolean {
  return (
    !!values.name.trim() &&
    (!requireType || values.type !== null) &&
    !!values.subType.trim() &&
    !!values.startingBalance.trim()
  );
}

/** Caller must have checked {@link isAccountFormValid} with `requireType`. */
export function toCreateAccountInput(
  values: AccountFormValues,
): CreateManualAccountInput {
  return {
    name: values.name.trim(),
    type: Number(values.type) as AccountType,
    subType: values.subType.trim(),
    startingBalance: values.startingBalance.trim(),
  };
}

export function toUpdateAccountInput(
  id: string,
  values: AccountFormValues,
): UpdateAccountInput {
  return {
    id,
    name: values.name.trim(),
    subType: values.subType.trim(),
    startingBalance: values.startingBalance.trim(),
  };
}
