import type { YearMonth } from "../../../utils/monthRange.js";
import { MonthTransactionsSection } from "./MonthTransactionsSection.js";
import { useMonthTransactionsData } from "./useMonthTransactionsData.js";

type MonthTransactionsProps = {
  month: YearMonth;
  categoryId?: string;
  onClearCategory: () => void;
};

export function MonthTransactions({
  month,
  categoryId,
  onClearCategory,
}: MonthTransactionsProps) {
  const data = useMonthTransactionsData(month, categoryId);
  return (
    <MonthTransactionsSection
      transactions={data.transactions}
      totalCount={data.totalCount}
      page={data.page}
      onPageChange={data.setPage}
      pageSize={data.pageSize}
      accountNameById={data.accountNameById}
      categoryNameById={data.categoryNameById}
      categoryName={data.categoryName}
      onClearCategory={onClearCategory}
      isLoading={data.isLoading}
      error={data.error}
    />
  );
}
