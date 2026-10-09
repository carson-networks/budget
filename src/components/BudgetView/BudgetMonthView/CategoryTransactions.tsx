import type { Category } from "../../../models";
import type { YearMonth } from "../../../utils/monthRange.js";
import { useTransactionCategoryEditing } from "../../TransactionsView/useTransactionCategoryEditing.js";
import { CategoryTransactionsPanel } from "./CategoryTransactionsPanel.js";
import { useCategoryTransactionsData } from "./useCategoryTransactionsData.js";

type CategoryTransactionsProps = {
  month: YearMonth;
  category: Category;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onBack: () => void;
};

export function CategoryTransactions({
  month,
  category,
  ...navigation
}: CategoryTransactionsProps) {
  const data = useCategoryTransactionsData(month, category.id);
  const categoryEditing = useTransactionCategoryEditing(data.categories, {
    disabled: data.isPlaceholderData,
  });
  return (
    <CategoryTransactionsPanel
      transactions={data.transactions}
      totalCount={data.totalCount}
      page={data.page}
      onPageChange={data.setPage}
      pageSize={data.pageSize}
      accountNameById={data.accountNameById}
      categoryNameById={data.categoryNameById}
      renderCategory={categoryEditing.renderCategory}
      categoryUpdateError={categoryEditing.error}
      onDismissCategoryUpdateError={categoryEditing.dismissError}
      categoryName={category.name}
      month={month}
      isLoading={data.isLoading}
      error={data.error}
      {...navigation}
    />
  );
}
