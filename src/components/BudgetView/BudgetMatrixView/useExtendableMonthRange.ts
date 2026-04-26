import type { RefObject } from "react";
import {
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";
import { addMonths } from "../../../utils/monthRange";
import type { YearMonth } from "../../../utils/monthRange";
import {
  MONTH_COLUMN_PX,
  EXTEND_CHUNK,
  EDGE_THRESHOLD_PX,
  MAX_TOTAL_MONTHS,
} from "../budgetMatrix";

type UseExtendableMonthRangeParams = {
  scrollRef: RefObject<HTMLDivElement | null>;
  months: YearMonth[];
  rangeStart: YearMonth;
  rangeEnd: YearMonth;
  setRangeStart: React.Dispatch<React.SetStateAction<YearMonth>>;
  setRangeEnd: React.Dispatch<React.SetStateAction<YearMonth>>;
  currentMonthIndex: number;
  /** When true, scroll listeners and layout scroll positioning run. */
  layoutReady: boolean;
  budgetsResponse: unknown;
};

/**
 * Horizontal infinite-scroll month strip: extend range when near edges,
 * preserve scroll position when prepending months, initial scroll to “today”.
 */
export function useExtendableMonthRange({
  scrollRef,
  months,
  rangeStart,
  rangeEnd,
  setRangeStart,
  setRangeEnd,
  currentMonthIndex,
  layoutReady,
  budgetsResponse,
}: UseExtendableMonthRangeParams) {
  const didInitialScrollRef = useRef(false);
  const pendingScrollAdjustRef = useRef(0);
  const extendingRef = useRef(false);

  const scrollToCurrentMonth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: currentMonthIndex * MONTH_COLUMN_PX,
      behavior: "smooth",
    });
  }, [scrollRef, currentMonthIndex]);

  const tryExtendFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || extendingRef.current) return;

    const { scrollLeft, clientWidth, scrollWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    if (maxScroll === 0) return;

    const totalMonths = months.length;
    if (totalMonths >= MAX_TOTAL_MONTHS) return;

    if (scrollLeft <= EDGE_THRESHOLD_PX) {
      if (totalMonths + EXTEND_CHUNK > MAX_TOTAL_MONTHS) return;
      extendingRef.current = true;
      pendingScrollAdjustRef.current = EXTEND_CHUNK * MONTH_COLUMN_PX;
      setRangeStart((s) => addMonths(s, -EXTEND_CHUNK));
      return;
    }

    if (scrollLeft >= maxScroll - EDGE_THRESHOLD_PX) {
      if (totalMonths + EXTEND_CHUNK > MAX_TOTAL_MONTHS) return;
      extendingRef.current = true;
      setRangeEnd((e) => addMonths(e, EXTEND_CHUNK));
    }
  }, [months.length, scrollRef, setRangeEnd, setRangeStart]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !layoutReady) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        tryExtendFromScroll();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [layoutReady, scrollRef, tryExtendFromScroll]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !layoutReady || !budgetsResponse) return;

    if (pendingScrollAdjustRef.current > 0) {
      el.scrollLeft += pendingScrollAdjustRef.current;
      pendingScrollAdjustRef.current = 0;
    } else if (!didInitialScrollRef.current) {
      el.scrollLeft = currentMonthIndex * MONTH_COLUMN_PX;
      didInitialScrollRef.current = true;
    }

    extendingRef.current = false;
  }, [
    rangeStart,
    rangeEnd,
    currentMonthIndex,
    layoutReady,
    budgetsResponse,
    months.length,
    scrollRef,
  ]);

  return { scrollToCurrentMonth };
}
