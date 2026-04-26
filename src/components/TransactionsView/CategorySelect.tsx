import { Select, type ComboboxData } from "@mantine/core";
import type { Category } from "../../hooks/useCategories";
import {
  countSelectableTransactionCategories,
  isSelectableTransactionCategory,
} from "./transactionCategorySelectData";

type CategorySelectProps = {
  categories: Category[];
  categorySelectData: ComboboxData;
  currentCategoryId: string | undefined;
  updatePending: boolean;
  onCategoryChange: (categoryId: string) => void;
};

export function CategorySelect({
  categories,
  categorySelectData,
  currentCategoryId,
  updatePending,
  onCategoryChange,
}: CategorySelectProps) {
  const currentIsSelectable = isSelectableTransactionCategory(
    categories,
    currentCategoryId,
  );

  return (
    <Select
      size="xs"
      placeholder="Pick category"
      data={categorySelectData}
      value={currentIsSelectable ? currentCategoryId! : null}
      onChange={(id) => {
        if (!id || id === currentCategoryId) return;
        onCategoryChange(id);
      }}
      disabled={
        updatePending || countSelectableTransactionCategories(categories) === 0
      }
      searchable
      nothingFoundMessage="No categories"
      comboboxProps={{ withinPortal: true }}
    />
  );
}
