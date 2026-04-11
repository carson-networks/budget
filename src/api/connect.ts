import { createClient, type Client } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AccountService } from "../gen/account/v1/account_pb.js";
import { BudgetService } from "../gen/budget/v1/budget_pb.js";
import { CategoryService } from "../gen/category/v1/category_pb.js";
import { PlaidService } from "../gen/plaid/v1/plaid_pb.js";
import { TransactionService } from "../gen/transaction/v1/transaction_pb.js";

const transport = createConnectTransport({
  baseUrl: "http://127.0.0.1:9447",
  useBinaryFormat: false,
});

export const accountClient: Client<typeof AccountService> = createClient(
  AccountService,
  transport,
);

export const transactionClient: Client<typeof TransactionService> = createClient(
  TransactionService,
  transport,
);

export const categoryClient: Client<typeof CategoryService> = createClient(
  CategoryService,
  transport,
);

export const budgetClient: Client<typeof BudgetService> = createClient(
  BudgetService,
  transport,
);

export const plaidClient: Client<typeof PlaidService> = createClient(
  PlaidService,
  transport,
);
