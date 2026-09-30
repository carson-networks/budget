import { CategoryType } from "../../../connectRPC/types.js";

export const CATEGORY_TYPE_OPTIONS = [
  { value: String(CategoryType.INCOME), label: "Income" },
  { value: String(CategoryType.EXPENSE), label: "Expense" },
];
