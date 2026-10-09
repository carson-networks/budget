import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShellStore } from "./stores/shell/useShellStore.js";

const api = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listBudgets: vi.fn(),
  getTransactionTotals: vi.fn(),
}));
vi.mock("./connectRPC/connect.js", () => ({
  categoryClient: {
    listCategories: api.listCategories,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
  },
  budgetClient: { listBudgets: api.listBudgets, setBudget: vi.fn() },
  transactionClient: { getTransactionTotals: api.getTransactionTotals },
}));

import App from "./App.js";

describe("App routes", () => {
  beforeEach(async () => {
    await useShellStore.persist.clearStorage();
    await useShellStore.persist.rehydrate();
    api.listCategories.mockResolvedValue({ categories: [] });
    api.listBudgets.mockResolvedValue({ budgets: [] });
    api.getTransactionTotals.mockResolvedValue({ byMonth: [] });
  });

  function renderApp(initialPath: string) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("serves the home page at / without redirecting", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { name: "Home", level: 2 }),
    ).toBeInTheDocument();
  });

  it("serves the budget month view at /budget and can switch to the matrix", async () => {
    renderApp("/budget");
    expect(
      screen.getByRole("heading", { name: "Budget", level: 4 }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Month totals")).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Budget matrix" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Matrix" }));
    expect(
      await screen.findByRole("table", { name: "Budget matrix" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Month totals")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { name: "Budget", level: 4 }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Month" }));
    expect(await screen.findByText("Month totals")).toBeInTheDocument();
  });

  it("serves the categories list at /categories", async () => {
    renderApp("/categories");
    expect(
      await screen.findByRole("heading", { name: "Categories", level: 4 }),
    ).toBeInTheDocument();
  });
});
