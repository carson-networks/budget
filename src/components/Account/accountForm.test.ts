import { describe, expect, it } from "vitest";
import { AccountType } from "../../connectRPC/types.js";
import { AccountIntegration, AccountKind, type Account } from "../../models";
import {
  accountFormFrom,
  emptyAccountForm,
  isAccountFormValid,
  toCreateAccountInput,
  toUpdateAccountInput,
  type AccountFormValues,
} from "./accountForm.js";

const filled: AccountFormValues = {
  name: "  Emergency  ",
  type: String(AccountKind.Cash),
  subType: " Savings ",
  startingBalance: " 100.50 ",
};

describe("accountForm", () => {
  it("starts empty with the Cash type selected", () => {
    expect(emptyAccountForm()).toEqual({
      name: "",
      type: String(AccountKind.Cash),
      subType: "",
      startingBalance: "",
    });
  });

  it("is valid only once every trimmed field is set", () => {
    const options = { requireType: true };
    expect(isAccountFormValid(emptyAccountForm(), options)).toBe(false);
    expect(
      isAccountFormValid({ ...filled, name: "   " }, options),
    ).toBe(false);
    expect(
      isAccountFormValid({ ...filled, subType: " \t " }, options),
    ).toBe(false);
    expect(
      isAccountFormValid({ ...filled, startingBalance: "  " }, options),
    ).toBe(false);
    expect(isAccountFormValid(filled, options)).toBe(true);
  });

  it("requires a type only when asked to", () => {
    const noType = { ...filled, type: null };
    expect(isAccountFormValid(noType, { requireType: true })).toBe(false);
    expect(isAccountFormValid(noType, { requireType: false })).toBe(true);
  });

  it("builds a trimmed create input with the mapped account type", () => {
    expect(toCreateAccountInput(filled)).toEqual({
      name: "Emergency",
      type: AccountType.CASH,
      subType: "Savings",
      startingBalance: "100.50",
    });
    expect(
      toCreateAccountInput({ ...filled, type: String(AccountKind.CreditCards) })
        .type,
    ).toBe(AccountType.CREDIT_CARDS);
  });

  it("seeds the edit form from an account and builds a trimmed update", () => {
    const account: Account = {
      id: "acc-1",
      name: "House Fund",
      accountKind: AccountKind.Cash,
      subType: "Checking",
      balance: "42.00",
      startingBalance: "10.00",
      integration: AccountIntegration.Manual,
    };
    const values = accountFormFrom(account);
    expect(values).toMatchObject({
      name: "House Fund",
      subType: "Checking",
      startingBalance: "10.00",
    });
    expect(toUpdateAccountInput("acc-1", filled)).toEqual({
      id: "acc-1",
      name: "Emergency",
      subType: "Savings",
      startingBalance: "100.50",
    });
  });
});
