import { Badge } from "@mantine/core";
import { CategoryKind } from "../../../models";

/** Only Income and Expense are shown in the UI; anything else maps to Expense. */
export function displayCategoryKind(kind: CategoryKind): string {
  return kind === CategoryKind.Income ? "Income" : "Expense";
}

/** Active categories show green Enabled; inactive show red Disabled. */
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
