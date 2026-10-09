import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { ActualAmountCell } from "./ActualAmountCell.js";

function renderCell(props: Parameters<typeof ActualAmountCell>[0]) {
  return render(
    <MantineProvider theme={theme}>
      <ActualAmountCell {...props} />
    </MantineProvider>,
  );
}

describe("ActualAmountCell", () => {
  it("renders plain amounts without a drill-in handler", () => {
    renderCell({ value: -320, categoryName: "Groceries" });
    expect(screen.getByText("-$320.00")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a dash without a drill-in when there is no actual", () => {
    renderCell({
      value: undefined,
      categoryName: "Groceries",
      onSelect: () => {},
    });
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("selects the category when clicked", async () => {
    const onSelect = vi.fn();
    renderCell({ value: -320, categoryName: "Groceries", onSelect });
    const button = screen.getByRole("button", {
      name: "Show Groceries transactions",
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("-$320.00");
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks the selected category as pressed", () => {
    renderCell({
      value: 12,
      categoryName: "Groceries",
      selected: true,
      onSelect: () => {},
    });
    expect(
      screen.getByRole("button", { name: "Show Groceries transactions" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
