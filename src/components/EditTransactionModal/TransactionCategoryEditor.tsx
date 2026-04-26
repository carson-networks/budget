import { Select, Text } from "@mantine/core";
import type { ComboboxData } from "@mantine/core";
import type { Category } from "../../hooks/useCategories";
import {
  countSelectableTransactionCategories,
  isSelectableTransactionCategory,
} from "../TransactionsView/transactionCategorySelectData";

type TransactionCategoryEditorProps = {
  categories: Category[];
  categorySelectData: ComboboxData;
  currentCategoryId: string | undefined;
  currentCategoryLabel: string;
  updatePending: boolean;
  onCategoryChange: (categoryId: string) => void;
};

export function TransactionCategoryEditor({
  categories,
  categorySelectData,
  currentCategoryId,
  currentCategoryLabel,
  updatePending,
  onCategoryChange,
}: TransactionCategoryEditorProps) {
  const currentIsSelectable = isSelectableTransactionCategory(
    categories,
    currentCategoryId,
  );

  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        Category
      </Text>
      <Select
        mt={4}
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
      />
      {currentCategoryId && !currentIsSelectable && (
        <Text size="xs" c="orange" mt={6}>
          Current assignment ({currentCategoryLabel}) is a parent or unavailable;
          choose a subcategory.
        </Text>
      )}
    </div>
  );
}
