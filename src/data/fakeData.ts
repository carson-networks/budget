import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import {
  AccountSchema,
  AccountType,
  type Account,
} from "../gen/account/v1/account_pb.js";
import {
  TransactionSchema,
  type Transaction,
} from "../gen/transaction/v1/transaction_pb.js";
import {
  CategorySchema,
  CategoryType,
  type Category,
} from "../gen/category/v1/category_pb.js";
import { BudgetSchema, type Budget } from "../gen/budget/v1/budget_pb.js";
import type { YearMonth } from "../utils/monthRange";
import { addMonths, monthsBetweenInclusive } from "../utils/monthRange";

const FAKE_BUDGET_OVERRIDES_KEY = "budget-app-fake-budget-overrides-v1";
/** How far forward recurring fake budgets are written (months from anchor). */
const FAKE_BUDGET_FORWARD_SPAN_MONTHS = 600;

/** Set `VITE_USE_FAKE_DATA=false` in `.env` to call the real API. */
export function isFakeBudgetData(): boolean {
  return import.meta.env.VITE_USE_FAKE_DATA !== "false";
}

const CHECKING = "acc-fake-checking";
const SAVINGS = "acc-fake-savings";
const CREDIT = "acc-fake-credit";

export const FAKE_ACCOUNTS: Account[] = [
  create(AccountSchema, {
    id: CHECKING,
    name: "Everyday Checking",
    type: AccountType.CASH,
    subType: "Checking",
    balance: "4821.37",
    startingBalance: "5000.00",
    createdAt: timestampFromDate(new Date("2024-01-15")),
  }),
  create(AccountSchema, {
    id: SAVINGS,
    name: "High-Yield Savings",
    type: AccountType.CASH,
    subType: "Savings",
    balance: "12640.50",
    startingBalance: "10000.00",
    createdAt: timestampFromDate(new Date("2024-02-01")),
  }),
  create(AccountSchema, {
    id: CREDIT,
    name: "Rewards Visa",
    type: AccountType.CREDIT_CARDS,
    subType: "Credit Card",
    balance: "-842.16",
    startingBalance: "0.00",
    createdAt: timestampFromDate(new Date("2023-11-20")),
  }),
];

function tx(
  id: string,
  accountId: string,
  name: string,
  amount: string,
  categoryId: string,
  date: Date,
): Transaction {
  return create(TransactionSchema, {
    id,
    accountId,
    categoryId,
    amount,
    transactionName: name,
    transactionDate: timestampFromDate(date),
    createdAt: timestampFromDate(date),
  });
}

/** Enough rows to exercise scrolling and pagination in the UI. */
export const FAKE_TRANSACTIONS: Transaction[] = [
  tx("txn-001", CHECKING, "Whole Foods Market", "-67.42", "Groceries", daysAgo(0)),
  tx("txn-002", CHECKING, "Direct Deposit — Employer", "3250.00", "Income", daysAgo(1)),
  tx("txn-003", CREDIT, "Shell Gas Station", "-48.90", "Transport", daysAgo(1)),
  tx("txn-004", CHECKING, "Netflix", "-15.99", "Subscriptions", daysAgo(2)),
  tx("txn-005", SAVINGS, "Transfer to Savings", "-500.00", "Transfer", daysAgo(3)),
  tx("txn-006", CHECKING, "Transfer from Savings", "500.00", "Transfer", daysAgo(3)),
  tx("txn-007", CREDIT, "Amazon.com", "-129.88", "Shopping", daysAgo(4)),
  tx("txn-008", CHECKING, "City Water Utility", "-62.40", "Utilities", daysAgo(5)),
  tx("txn-009", CHECKING, "Peet's Coffee", "-6.75", "Dining", daysAgo(5)),
  tx("txn-010", CHECKING, "Freelance Invoice #1042", "850.00", "Income", daysAgo(6)),
  tx("txn-011", CREDIT, "Trader Joe's", "-54.13", "Groceries", daysAgo(7)),
  tx("txn-012", CHECKING, "Spotify", "-10.99", "Subscriptions", daysAgo(8)),
  tx("txn-013", SAVINGS, "Interest Payment", "12.34", "Income", daysAgo(9)),
  tx("txn-014", CHECKING, "Uber", "-23.50", "Transport", daysAgo(10)),
  tx("txn-015", CREDIT, "Target", "-88.20", "Shopping", daysAgo(11)),
  tx("txn-016", CHECKING, "Mortgage Payment", "-1850.00", "Housing", daysAgo(12)),
  tx("txn-017", CHECKING, "Gym Membership", "-49.00", "Health", daysAgo(13)),
  tx("txn-018", CHECKING, "Pharmacy Co-Pay", "-12.00", "Health", daysAgo(14)),
  tx("txn-019", CREDIT, "Restaurant — Osha Thai", "-64.00", "Dining", daysAgo(15)),
  tx("txn-020", CHECKING, "Electric Company", "-94.17", "Utilities", daysAgo(16)),
  tx("txn-021", CHECKING, "ATM Withdrawal", "-120.00", "Cash", daysAgo(17)),
  tx("txn-022", SAVINGS, "Emergency Fund Auto-Save", "-200.00", "Transfer", daysAgo(18)),
  tx("txn-023", CHECKING, "Coffee Shop", "-4.50", "Dining", daysAgo(19)),
  tx("txn-024", CREDIT, "Annual Software License", "-199.00", "Subscriptions", daysAgo(20)),
  tx("txn-025", CHECKING, "Farmers Market", "-28.00", "Groceries", daysAgo(21)),
  tx("txn-026", CHECKING, "Parking", "-18.00", "Transport", daysAgo(22)),
  tx("txn-027", CREDIT, "Flight — Work Trip", "-412.00", "Travel", daysAgo(23)),
  tx("txn-028", CHECKING, "Refund — Return", "39.99", "Shopping", daysAgo(24)),
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function makeFakeAccount(input: {
  name: string;
  type: AccountType;
  subType: string;
  startingBalance: string;
}): Account {
  return create(AccountSchema, {
    id: `acc-fake-${crypto.randomUUID()}`,
    name: input.name,
    type: input.type,
    subType: input.subType,
    balance: input.startingBalance,
    startingBalance: input.startingBalance,
    createdAt: timestampFromDate(new Date()),
  });
}

export function makeFakeTransaction(input: {
  accountId: string;
  categoryId: string;
  amount: string;
  transactionName: string;
  transactionDate: string;
}): Transaction {
  const date = new Date(input.transactionDate);
  return create(TransactionSchema, {
    id: `txn-fake-${crypto.randomUUID()}`,
    accountId: input.accountId,
    categoryId: input.categoryId,
    amount: input.amount,
    transactionName: input.transactionName,
    transactionDate: timestampFromDate(date),
    createdAt: timestampFromDate(new Date()),
  });
}

const CAT_INCOME = "cat-fake-income";
const CAT_EXPENSE_ROOT = "cat-fake-expenses";
const CAT_SAVINGS_GOALS = "cat-fake-savings-goals";

export const FAKE_CATEGORIES: Category[] = [
  create(CategorySchema, {
    id: CAT_INCOME,
    name: "Income",
    isParent: true,
    isDisabled: false,
    categoryType: CategoryType.INCOME,
    createdAt: timestampFromDate(new Date("2024-01-10")),
  }),
  create(CategorySchema, {
    id: "cat-fake-salary",
    name: "Salary",
    isParent: false,
    parentCategoryId: CAT_INCOME,
    isDisabled: false,
    categoryType: CategoryType.INCOME,
    createdAt: timestampFromDate(new Date("2024-01-10")),
  }),
  create(CategorySchema, {
    id: "cat-fake-freelance",
    name: "Freelance",
    isParent: false,
    parentCategoryId: CAT_INCOME,
    isDisabled: false,
    categoryType: CategoryType.INCOME,
    createdAt: timestampFromDate(new Date("2024-01-10")),
  }),
  create(CategorySchema, {
    id: "cat-fake-investment-income",
    name: "Investment Income",
    isParent: false,
    parentCategoryId: CAT_INCOME,
    isDisabled: true,
    categoryType: CategoryType.INCOME,
    createdAt: timestampFromDate(new Date("2024-01-10")),
  }),
  create(CategorySchema, {
    id: CAT_EXPENSE_ROOT,
    name: "Living Expenses",
    isParent: true,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-11")),
  }),
  create(CategorySchema, {
    id: "cat-fake-rent",
    name: "Rent",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-11")),
  }),
  create(CategorySchema, {
    id: "cat-fake-utilities",
    name: "Utilities",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-11")),
  }),
  create(CategorySchema, {
    id: "cat-fake-groceries",
    name: "Groceries",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-12")),
  }),
  create(CategorySchema, {
    id: "cat-fake-restaurants",
    name: "Restaurants",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-12")),
  }),
  create(CategorySchema, {
    id: "cat-fake-coffee",
    name: "Coffee Shops",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-12")),
  }),
  create(CategorySchema, {
    id: "cat-fake-fuel",
    name: "Fuel",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-13")),
  }),
  create(CategorySchema, {
    id: "cat-fake-transit",
    name: "Public Transit",
    isParent: false,
    parentCategoryId: CAT_EXPENSE_ROOT,
    isDisabled: true,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-01-13")),
  }),
  create(CategorySchema, {
    id: CAT_SAVINGS_GOALS,
    name: "Savings Goals",
    isParent: true,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-02-01")),
  }),
  create(CategorySchema, {
    id: "cat-fake-emergency",
    name: "Emergency Fund",
    isParent: false,
    parentCategoryId: CAT_SAVINGS_GOALS,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-02-01")),
  }),
  create(CategorySchema, {
    id: "cat-fake-vacation",
    name: "Vacation",
    isParent: false,
    parentCategoryId: CAT_SAVINGS_GOALS,
    isDisabled: false,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2024-02-01")),
  }),
  create(CategorySchema, {
    id: "cat-fake-legacy",
    name: "Legacy Uncategorized",
    isParent: false,
    isDisabled: true,
    categoryType: CategoryType.EXPENSE,
    createdAt: timestampFromDate(new Date("2023-06-01")),
  }),
];

export function makeFakeCategory(input: {
  name: string;
  isParent: boolean;
  parentCategoryId?: string;
  isDisabled: boolean;
  categoryType: CategoryType;
}): Category {
  return create(CategorySchema, {
    id: `cat-fake-${crypto.randomUUID()}`,
    name: input.name,
    isParent: input.isParent,
    parentCategoryId: input.parentCategoryId,
    isDisabled: input.isDisabled,
    categoryType: input.categoryType,
    createdAt: timestampFromDate(new Date()),
  });
}

function fakeBudgetAmount(categoryId: string, year: number, month: number): string {
  let h = 0;
  for (let i = 0; i < categoryId.length; i++) {
    h = Math.imul(31, h) + categoryId.charCodeAt(i);
  }
  const base = (Math.abs(h) % 750) + 40;
  const bump = (year * 12 + month) % 120;
  return (base + bump).toFixed(2);
}

/** Deterministic mock budgets for every category × month in the inclusive range. */
export function buildFakeBudgetsForCategories(
  categories: Category[],
  rangeStart: YearMonth,
  rangeEnd: YearMonth,
): Budget[] {
  const months = monthsBetweenInclusive(rangeStart, rangeEnd);
  const out: Budget[] = [];
  for (const c of categories) {
    for (const { year, month } of months) {
      out.push(
        create(BudgetSchema, {
          categoryId: c.id,
          year,
          month,
          amount: fakeBudgetAmount(c.id, year, month),
        }),
      );
    }
  }
  return applyFakeBudgetOverrides(out);
}

function loadFakeBudgetOverrideMap(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(FAKE_BUDGET_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function saveFakeBudgetOverrideMap(map: Record<string, string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FAKE_BUDGET_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

function fakeBudgetStorageKey(
  categoryId: string,
  year: number,
  month: number,
): string {
  return `${categoryId}|${year}|${month}`;
}

/** Merge saved user edits (including recurring months) onto generated fake budgets. */
export function applyFakeBudgetOverrides(budgets: Budget[]): Budget[] {
  const map = loadFakeBudgetOverrideMap();
  if (Object.keys(map).length === 0) return budgets;
  return budgets.map((b) => {
    const k = fakeBudgetStorageKey(b.categoryId, b.year, b.month);
    const amt = map[k];
    if (amt === undefined) return b;
    return { ...b, amount: amt };
  });
}

/** Persist a fake-data budget edit so it survives reload (and recurring months). */
export function recordFakeBudgetOverride(input: {
  categoryId: string;
  year: number;
  month: number;
  amount: string;
  overwriteFutureMonths: boolean;
}): void {
  const map = loadFakeBudgetOverrideMap();
  const anchor: YearMonth = { year: input.year, month: input.month };
  if (!input.overwriteFutureMonths) {
    map[fakeBudgetStorageKey(input.categoryId, input.year, input.month)] =
      input.amount;
  } else {
    const end = addMonths(anchor, FAKE_BUDGET_FORWARD_SPAN_MONTHS);
    for (const ym of monthsBetweenInclusive(anchor, end)) {
      map[fakeBudgetStorageKey(input.categoryId, ym.year, ym.month)] =
        input.amount;
    }
  }
  saveFakeBudgetOverrideMap(map);
}
