import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const NEEDS_REVIEW_PARAM = "needsReview";

export function useNeedsReviewOnly() {
  const [searchParams, setSearchParams] = useSearchParams();
  const needsReviewOnly = searchParams.get(NEEDS_REVIEW_PARAM) === "true";

  const setNeedsReviewOnly = useCallback(
    (value: boolean) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(NEEDS_REVIEW_PARAM, "true");
          else next.delete(NEEDS_REVIEW_PARAM);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  return [needsReviewOnly, setNeedsReviewOnly] as const;
}
