import type { Category } from "../../../models";
import type { YearMonth } from "../../../utils/monthRange.js";
import { useTransactionCategoryEditing } from "../../TransactionsView/useTransactionCategoryEditing.js";
import { CategoryTransactionsHeader } from "./CategoryTransactionsHeader.js";
import { CategoryTransactionsTable } from "./CategoryTransactionsTable.js";
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
    <>
      <CategoryTransactionsHeader
        categoryName={category.name}
        month={month}
        {...navigation}
      />
      <CategoryTransactionsTable
        transactions={data.transactions}
        totalCount={data.totalCount}
        page={data.page}
        onPageChange={data.setPage}
        pageSize={data.pageSize}
        accountNameById={data.accountNameById}
        categoryNameById={data.categoryNameById}
        renderCategory={categoryEditing.renderCategory}
        categoryName={category.name}
        isLoading={data.isLoading}
        error={data.error}
        categoryUpdateError={categoryEditing.error}
        onDismissCategoryUpdateError={categoryEditing.dismissError}
      />
    </>
  );
}
