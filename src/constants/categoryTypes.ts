import { CategoryType } from "../hooks/useCategories";

export const CATEGORY_TYPES = [
  { value: String(CategoryType.INCOME), label: "Income" },
  { value: String(CategoryType.EXPENSE), label: "Expense" },
];

export function categoryTypeToSelectValue(t: CategoryType): string {
  return t === CategoryType.INCOME
    ? String(CategoryType.INCOME)
    : String(CategoryType.EXPENSE);
}
