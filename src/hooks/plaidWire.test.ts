import { describe, expect, it } from "vitest";
import { AccountType } from "../connectRPC/types.js";
import { exchangeTokenRequestFromPlaidSuccess } from "./plaidWire.js";

describe("exchangeTokenRequestFromPlaidSuccess", () => {
  it("builds an ExchangeTokenRequest from Plaid metadata", () => {
    const req = exchangeTokenRequestFromPlaidSuccess("pub-token", {
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

    expect(req.publicToken).toBe("pub-token");
    expect(req.institutionId).toBe("ins_1");
    expect(req.institutionName).toBe("Test Bank");
    expect(req.accounts).toHaveLength(1);
    expect(req.accounts[0].plaidAccountId).toBe("acc-plaid");
    expect(req.accounts[0].type).toBe(AccountType.CASH);
    expect(req.accounts[0].subType).toBe("plaid:checking");
  });

  it("maps credit accounts to credit card type", () => {
    const req = exchangeTokenRequestFromPlaidSuccess("t", {
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
    expect(req.accounts[0].type).toBe(AccountType.CREDIT_CARDS);
  });
});
