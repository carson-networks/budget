import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AccountService } from "../gen/account/v1/account_pb.js";
import { BudgetService } from "../gen/budget/v1/budget_pb.js";
import { CategoryService } from "../gen/category/v1/category_pb.js";
import { PlaidService } from "../gen/plaid/v1/plaid_pb.js";
import { TransactionService } from "../gen/transaction/v1/transaction_pb.js";

const baseUrl =
  (import.meta.env.VITE_CONNECT_URL as string | undefined) ??
  "http://localhost:9447";

export const transport = createConnectTransport({ baseUrl });

export const accountClient = createClient(AccountService, transport);
export const budgetClient = createClient(BudgetService, transport);
export const categoryClient = createClient(CategoryService, transport);
export const plaidClient = createClient(PlaidService, transport);
export const transactionClient = createClient(TransactionService, transport);
