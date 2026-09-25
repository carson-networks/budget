import { describe, expect, it } from "vitest";
import { AccountKind } from "../models";
import { exchangeTokenInputFromPlaidSuccess } from "./plaidWire.js";

describe("exchangeTokenInputFromPlaidSuccess", () => {
  it("builds ExchangeTokenInput from Plaid metadata", () => {
    const input = exchangeTokenInputFromPlaidSuccess("pub-token", {
      institution: {
        institution_id: "ins_1",
        name: "Test Bank",
      },
      accounts: [
        {
          id: "acc-plaid",
          name: "Checking",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          verification_status: "",
        },
      ],
      link_session_id: "sess",
    });

    expect(input.publicToken).toBe("pub-token");
    expect(input.institutionId).toBe("ins_1");
    expect(input.institutionName).toBe("Test Bank");
    expect(input.accounts).toHaveLength(1);
    expect(input.accounts[0].plaidAccountId).toBe("acc-plaid");
    expect(input.accounts[0].accountKind).toBe(AccountKind.Cash);
    expect(input.accounts[0].subType).toBe("checking");
  });

  it("maps credit accounts to credit card kind", () => {
    const input = exchangeTokenInputFromPlaidSuccess("t", {
      institution: null,
      accounts: [
        {
          id: "x",
          name: "Card",
          mask: "",
          type: "credit",
          subtype: "credit card",
          verification_status: "",
        },
      ],
      link_session_id: "s",
    });
    expect(input.accounts[0].accountKind).toBe(AccountKind.CreditCards);
  });

  it("uses default account name when Plaid sends blank", () => {
    const input = exchangeTokenInputFromPlaidSuccess("t", {
      institution: null,
      accounts: [
        {
          id: "x",
          name: "   ",
          mask: "",
          type: "depository",
          subtype: "checking",
          verification_status: "",
        },
      ],
      link_session_id: "s",
    });
    expect(input.accounts[0].name).toBe("Linked account");
  });
});
