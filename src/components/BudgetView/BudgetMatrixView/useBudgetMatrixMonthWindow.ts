import { useMemo, useState } from "react";
import {
  addMonths,
  currentYearMonth,
  monthsBetweenInclusive,
  type YearMonth,
} from "../../../utils/monthRange";
import { INITIAL_MONTHS_EACH_SIDE } from "../budgetMatrix";

export function useBudgetMatrixMonthWindow() {
  const nowYm = useMemo(() => currentYearMonth(), []);

  const [rangeStart, setRangeStart] = useState<YearMonth>(() =>
    addMonths(nowYm, -INITIAL_MONTHS_EACH_SIDE),
  );
  const [rangeEnd, setRangeEnd] = useState<YearMonth>(() =>
    addMonths(nowYm, INITIAL_MONTHS_EACH_SIDE),
  );

  const months = useMemo(
    () => monthsBetweenInclusive(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const currentMonthIndex = useMemo(() => {
    const idx = months.findIndex(
      (m) => m.year === nowYm.year && m.month === nowYm.month,
    );
    return idx >= 0 ? idx : 0;
  }, [months, nowYm]);

  return {
    nowYm,
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    months,
    currentMonthIndex,
  };
}
