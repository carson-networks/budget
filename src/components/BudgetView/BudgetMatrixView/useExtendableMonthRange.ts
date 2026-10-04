import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { addMonths, type YearMonth } from "../../../utils/monthRange.js";
import {
  EDGE_THRESHOLD_PX,
  EXTEND_CHUNK,
  MAX_TOTAL_MONTHS,
  MONTH_COLUMN_PX,
} from "./budgetMatrix.js";

type Params = {
  scrollRef: RefObject<HTMLDivElement | null>;
  monthCount: number;
  currentMonthIndex: number;
  layoutReady: boolean;
  setRangeStart: Dispatch<SetStateAction<YearMonth>>;
  setRangeEnd: Dispatch<SetStateAction<YearMonth>>;
};

export function useExtendableMonthRange({
  scrollRef,
  monthCount,
  currentMonthIndex,
  layoutReady,
  setRangeStart,
  setRangeEnd,
}: Params) {
  const initializedElement = useRef<HTMLDivElement | null>(null);
  const pendingAdjustment = useRef(0);
  const extending = useRef(false);
  const scrollToCurrentMonth = useCallback(() => {
    scrollRef.current?.scrollTo({
      left: currentMonthIndex * MONTH_COLUMN_PX,
      behavior: "smooth",
    });
  }, [scrollRef, currentMonthIndex]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !layoutReady) return;
    if (pendingAdjustment.current) {
      el.scrollLeft += pendingAdjustment.current;
      pendingAdjustment.current = 0;
    } else if (initializedElement.current !== el) {
      el.scrollLeft = currentMonthIndex * MONTH_COLUMN_PX;
      initializedElement.current = el;
    }
    extending.current = false;
  }, [scrollRef, layoutReady, monthCount, currentMonthIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !layoutReady) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (extending.current) return;
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
        const count = Math.min(EXTEND_CHUNK, MAX_TOTAL_MONTHS - monthCount);
        if (!maxScroll || count <= 0) return;
        if (el.scrollLeft <= EDGE_THRESHOLD_PX) {
          extending.current = true;
          pendingAdjustment.current = count * MONTH_COLUMN_PX;
          setRangeStart((start) => addMonths(start, -count));
        } else if (el.scrollLeft >= maxScroll - EDGE_THRESHOLD_PX) {
          extending.current = true;
          setRangeEnd((end) => addMonths(end, count));
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [scrollRef, layoutReady, monthCount, setRangeStart, setRangeEnd]);
  return { scrollToCurrentMonth };
}
