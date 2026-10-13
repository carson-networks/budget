import { useMemo, useState } from "react";
import {
  addMonths,
  currentYearMonth,
  monthsBetweenInclusive,
} from "../../../utils/monthRange.js";
import { INITIAL_MONTHS_EACH_SIDE } from "./budgetMatrix.js";

export function useBudgetMatrixMonthWindow() {
  const [nowYm] = useState(currentYearMonth);
  const [rangeStart, setRangeStart] = useState(() =>
    addMonths(nowYm, -INITIAL_MONTHS_EACH_SIDE),
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    addMonths(nowYm, INITIAL_MONTHS_EACH_SIDE),
  );
  const months = useMemo(
    () => monthsBetweenInclusive(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );
  const currentMonthIndex = months.findIndex(
    (month) => month.year === nowYm.year && month.month === nowYm.month,
  );
  return { nowYm, months, currentMonthIndex, setRangeStart, setRangeEnd };
}
