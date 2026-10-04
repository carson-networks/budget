import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { transactionClient } from "../connectRPC/connect.js";
import { connectErrorMessage } from "../connectRPC/errors.js";
import type { GetTransactionTotalsResponse } from "../connectRPC/types.js";
import {
  mapGetTransactionTotalsResponse,
  type TransactionTotalsByMonth,
} from "../models";
import type { YearMonth } from "../utils/monthRange.js";

function totalsQueryKey(start: YearMonth, end: YearMonth) {
  return [
    "transactionTotals",
    start.year,
    start.month,
    end.year,
    end.month,
  ] as const;
}

/** Category totals by month for an inclusive calendar range. */
export function useTransactionTotalsForRange(
  start: YearMonth,
  end: YearMonth,
) {
  const query = useQuery<GetTransactionTotalsResponse, Error>({
    queryKey: totalsQueryKey(start, end),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      try {
        return await transactionClient.getTransactionTotals({
          startMonth: start.month,
          startYear: start.year,
          endMonth: end.month,
          endYear: end.year,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e));
      }
    },
  });

  const totals: TransactionTotalsByMonth | undefined = query.data
    ? mapGetTransactionTotalsResponse(query.data)
    : undefined;

  return {
    ...query,
    totals,
  };
}
