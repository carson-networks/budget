import { Select, type ComboboxData } from "@mantine/core";
import type { Category } from "../../models";
import { isSelectableTransactionCategory } from "./transactionCategorySelectData.js";

type CategorySelectProps = {
  categories: readonly Category[];
  data: ComboboxData;
  currentCategoryId: string | undefined;
  pending: boolean;
  transactionName: string;
  onCategoryChange: (categoryId: string) => void;
};

export function CategorySelect({
  categories,
  data,
  currentCategoryId,
  pending,
  transactionName,
  onCategoryChange,
}: CategorySelectProps) {
  return (
    <Select
      size="xs"
      aria-label={`Category for ${transactionName}`}
      placeholder="Pick category"
      data={data}
      value={
        isSelectableTransactionCategory(categories, currentCategoryId)
          ? currentCategoryId
          : null
      }
      onChange={(id) => {
        if (id && id !== currentCategoryId) onCategoryChange(id);
      }}
      disabled={
        pending ||
        !categories.some(
          (category) => !category.isParent && !category.isDisabled,
        )
      }
      searchable
      nothingFoundMessage="No categories"
      comboboxProps={{ withinPortal: true }}
    />
  );
}
