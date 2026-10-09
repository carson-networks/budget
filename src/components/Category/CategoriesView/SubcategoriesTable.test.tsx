import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";
import { SegmentHeader } from "./SegmentHeader.js";
import { SubcategoriesTable } from "./SubcategoriesTable.js";

const root: Category = {
  id: "income",
  name: "Earnings",
  isParent: true,
  isDisabled: false,
  categoryKind: CategoryKind.Income,
};

describe("SegmentHeader", () => {
  it("shows the parent name, kind, and enabled status", () => {
    render(
      <MantineProvider theme={theme}>
        <SegmentHeader root={root} onRootSettings={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.getByText("Earnings")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Settings for Earnings" }),
    ).toBeInTheDocument();
  });

  it("shows Disabled for inactive parents", () => {
    render(
      <MantineProvider theme={theme}>
        <SegmentHeader
          root={{ ...root, isDisabled: true }}
          onRootSettings={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("calls onRootSettings when the settings button is clicked", async () => {
    const onRootSettings = vi.fn();
    const user = userEvent.setup();

    render(
      <MantineProvider theme={theme}>
        <SegmentHeader root={root} onRootSettings={onRootSettings} />
      </MantineProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Settings for Earnings" }),
    );
    expect(onRootSettings).toHaveBeenCalledOnce();
  });
});

describe("SubcategoriesTable", () => {
  it("renders child names, status chips, and settings actions", () => {
    render(
      <MantineProvider theme={theme}>
        <SubcategoriesTable
          categories={[
            {
              id: "pay",
              name: "Paycheck",
              isParent: false,
              parentCategoryId: "income",
              isDisabled: false,
              categoryKind: CategoryKind.Income,
            },
          ]}
          onRowSettings={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Paycheck")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Settings for Paycheck" }),
    ).toBeInTheDocument();
  });

  it("calls onRowSettings with the row category", async () => {
    const onRowSettings = vi.fn();
    const child: Category = {
      id: "pay",
      name: "Paycheck",
      isParent: false,
      parentCategoryId: "income",
      isDisabled: false,
      categoryKind: CategoryKind.Income,
    };
    const user = userEvent.setup();

    render(
      <MantineProvider theme={theme}>
        <SubcategoriesTable
          categories={[child]}
          onRowSettings={onRowSettings}
        />
      </MantineProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Settings for Paycheck" }),
    );
    expect(onRowSettings).toHaveBeenCalledWith(child);
  });
});
