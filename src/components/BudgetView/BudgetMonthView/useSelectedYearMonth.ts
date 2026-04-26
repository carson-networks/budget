import { useState, useCallback } from "react";
import {
  addMonths,
  currentYearMonth,
  type YearMonth,
} from "../../../utils/monthRange";

export function useSelectedYearMonth(
  initial: YearMonth = currentYearMonth(),
) {
  const [selectedMonth, setSelectedMonth] = useState<YearMonth>(initial);

  const goPrev = useCallback(
    () => setSelectedMonth((m) => addMonths(m, -1)),
    [],
  );
  const goNext = useCallback(
    () => setSelectedMonth((m) => addMonths(m, 1)),
    [],
  );
  const goToToday = useCallback(
    () => setSelectedMonth(currentYearMonth()),
    [],
  );

  return { selectedMonth, setSelectedMonth, goPrev, goNext, goToToday };
}
