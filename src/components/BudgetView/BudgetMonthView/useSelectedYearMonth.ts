import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addMonths,
  currentYearMonth,
  parseYearMonthKey,
  yearMonthKey,
} from "../../../utils/monthRange.js";

const MONTH_PARAM = "month";

export function useSelectedYearMonth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMonth =
    parseYearMonthKey(searchParams.get(MONTH_PARAM)) ?? currentYearMonth();

  const shiftMonth = useCallback(
    (delta: number) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const month = parseYearMonthKey(prev.get(MONTH_PARAM));
          next.set(
            MONTH_PARAM,
            yearMonthKey(addMonths(month ?? currentYearMonth(), delta)),
          );
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const goPrev = useCallback(() => shiftMonth(-1), [shiftMonth]);
  const goNext = useCallback(() => shiftMonth(1), [shiftMonth]);
  const goToToday = useCallback(
    () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(MONTH_PARAM);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  return { selectedMonth, goPrev, goNext, goToToday };
}
