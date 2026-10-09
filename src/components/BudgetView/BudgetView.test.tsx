import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../theme.js";

vi.mock("./BudgetMatrixView/MatrixView.js", () => ({
  default: () => <div>matrix stub</div>,
}));
vi.mock("./BudgetMonthView/MonthView.js", () => ({
  default: () => <div>month stub</div>,
}));

import BudgetView from "./BudgetView.js";

function LocationDisplay() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

function renderBudgetView(entry: string) {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[entry]}>
        <BudgetView />
        <LocationDisplay />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("BudgetView", () => {
  it("defaults to the matrix view", () => {
    renderBudgetView("/budget");
    expect(screen.getByText("matrix stub")).toBeInTheDocument();
  });

  it("shows the month view from the URL", () => {
    renderBudgetView("/budget?view=month&month=2025-03");
    expect(screen.getByText("month stub")).toBeInTheDocument();
  });

  it("keeps the month when switching views", async () => {
    renderBudgetView("/budget?month=2025-03");
    await userEvent.click(screen.getByText("Month"));

    expect(screen.getByText("month stub")).toBeInTheDocument();
    expect(screen.getByTestId("search")).toHaveTextContent(
      "?month=2025-03&view=month",
    );
  });
});
