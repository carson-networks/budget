import type { Category } from "../../../models";
import type { YearMonth } from "../../../utils/monthRange.js";
import { CategoryTransactionsPanel } from "./CategoryTransactionsPanel.js";
import { useCategoryTransactionsData } from "./useCategoryTransactionsData.js";

type CategoryTransactionsProps = {
  month: YearMonth;
  category: Category;
  onBack: () => void;
};

export function CategoryTransactions({
  month,
  category,
  onBack,
}: CategoryTransactionsProps) {
  const data = useCategoryTransactionsData(month, category.id);
  return (
    <CategoryTransactionsPanel
      transactions={data.transactions}
      totalCount={data.totalCount}
      page={data.page}
      onPageChange={data.setPage}
      pageSize={data.pageSize}
      accountNameById={data.accountNameById}
      categoryNameById={data.categoryNameById}
      categoryName={category.name}
      onBack={onBack}
      isLoading={data.isLoading}
      error={data.error}
    />
  );
}
