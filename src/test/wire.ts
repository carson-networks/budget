import type { Account, Category } from "../models";

/** Domain model → the wire shape a mocked ConnectRPC list call would return. */
export const wireAccount = (account: Account) => ({
  id: account.id,
  name: account.name,
  type: account.accountKind,
  subType: account.subType,
  balance: account.balance,
  startingBalance: account.startingBalance,
});

export const wireCategory = (category: Category) => ({
  id: category.id,
  name: category.name,
  isParent: category.isParent,
  parentCategoryId: category.parentCategoryId,
  isDisabled: category.isDisabled,
  categoryType: category.categoryKind,
});
