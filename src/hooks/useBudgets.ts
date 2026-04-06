import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetClient, transactionClient } from "../api/connect";
import { connectErrorMessage } from "../api/connectError";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { SetBudgetRequestSchema } from "../gen/budget/v1/budget_pb.js";

export type SetBudgetInput = MessageInitShape<typeof SetBudgetRequestSchema>;

export function useBudgetsForMonth(year: number, month: number) {
  return useQuery({
    queryKey: ["budgets", year, month],
    queryFn: async () => {
      try {
        const res = await budgetClient.listBudgets({
          startMonth: month,
          startYear: year,
          endMonth: month,
          endYear: year,
        });
        return res.budgets ?? [];
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to load budgets"));
      }
    },
  });
}

export function useTransactionTotalsForMonth(year: number, month: number) {
  return useQuery({
    queryKey: ["transaction-totals", year, month],
    queryFn: async () => {
      try {
        return await transactionClient.getTransactionTotals({
          startMonth: month,
          startYear: year,
          endMonth: month,
          endYear: year,
        });
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to load transaction totals"));
      }
    },
  });
}

export function useSetBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: SetBudgetInput) => {
      try {
        await budgetClient.setBudget(body);
      } catch (e) {
        throw new Error(connectErrorMessage(e, "Failed to save budget"));
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budgets", variables.year, variables.month],
      });
    },
  });
}
