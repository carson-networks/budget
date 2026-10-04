import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryKind } from "../../../models";
import { theme } from "../../../theme.js";
import { MatrixBudgetInput } from "./MatrixBudgetInput.js";

const { setBudgetMock } = vi.hoisted(() => ({ setBudgetMock: vi.fn() }));
vi.mock("../../../connectRPC/connect.js", () => ({
  budgetClient: { setBudget: setBudgetMock },
}));

describe("MatrixBudgetInput", () => {
  it("saves through the budget hook, isolates pending state, and invalidates all budget ranges", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    setBudgetMock.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const category = {
      id: "food",
      name: "Food",
      isParent: false,
      isDisabled: false,
      categoryKind: CategoryKind.Expense,
    };
    const nowYm = { year: 2025, month: 3 };
    render(
      <MantineProvider theme={theme}>
        <QueryClientProvider client={client}>
          <MatrixBudgetInput
            category={category}
            nowYm={nowYm}
            month={nowYm}
            amount="400"
            applyToFutureMonths={false}
          />
          <MatrixBudgetInput
            category={category}
            nowYm={nowYm}
            month={{ year: 2025, month: 4 }}
            amount="400"
            applyToFutureMonths={false}
          />
        </QueryClientProvider>
      </MantineProvider>,
    );
    const march = screen.getByRole("textbox", {
      name: "Food budget for Mar 2025",
    });
    const april = screen.getByRole("textbox", {
      name: "Food budget for Apr 2025",
    });
    await user.clear(march);
    await user.type(march, "450{Enter}");
    await waitFor(() => expect(march).toBeDisabled());
    expect(april).toBeEnabled();
    expect(setBudgetMock).toHaveBeenCalledWith({
      categoryId: "food",
      year: 2025,
      month: 3,
      amount: "450",
      overwriteFutureMonths: false,
    });
    await act(async () => {
      finish();
    });
    await waitFor(() => expect(march).toBeEnabled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["budgets"] });
    client.clear();
  });
});
