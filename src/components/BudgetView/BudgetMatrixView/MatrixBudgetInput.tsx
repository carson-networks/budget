import { useSetBudget } from "../../../hooks/useBudgets.js";
import {
  compareYearMonth,
  formatYearMonthLabel,
  type YearMonth,
} from "../../../utils/monthRange.js";
import { BudgetCellInput } from "../shared/BudgetCellInput.js";
import type { Category } from "../../../models";

type Props = {
  category: Category;
  month: YearMonth;
  nowYm: YearMonth;
  amount: string | undefined;
  applyToFutureMonths: boolean;
  disabled?: boolean;
};

export function MatrixBudgetInput({
  category,
  month,
  nowYm,
  amount,
  applyToFutureMonths,
  disabled,
}: Props) {
  const setBudget = useSetBudget();
  return (
    <BudgetCellInput
      label={`${category.name} budget for ${formatYearMonthLabel(month)}`}
      amountStr={amount}
      saving={setBudget.isPending}
      disabled={disabled}
      onCommit={(value) =>
        setBudget.mutateAsync({
          categoryId: category.id,
          ...month,
          amount: value,
          overwriteFutureMonths:
            applyToFutureMonths && compareYearMonth(month, nowYm) >= 0,
        })
      }
    />
  );
}
