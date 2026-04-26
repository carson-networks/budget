import { Badge } from "@mantine/core";
import { CategoryType } from "../../hooks/useCategories";

/** Only Income and Expense are shown in the UI; anything else maps to Expense. */
export function displayCategoryType(type: CategoryType): string {
  return type === CategoryType.INCOME ? "Income" : "Expense";
}

/** `isDisabled` from API: active categories show green Enabled; inactive show red Disabled. */
export function enabledStatusChip(isDisabled: boolean) {
  if (isDisabled) {
    return (
      <Badge color="red" variant="light" size="sm">
        Disabled
      </Badge>
    );
  }
  return (
    <Badge color="green" variant="light" size="sm">
      Enabled
    </Badge>
  );
}
