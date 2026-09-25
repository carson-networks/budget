import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
        <SegmentHeader root={root} />
      </MantineProvider>,
    );

    expect(screen.getByText("Earnings")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("shows Disabled for inactive parents", () => {
    render(
      <MantineProvider theme={theme}>
        <SegmentHeader root={{ ...root, isDisabled: true }} />
      </MantineProvider>,
    );

    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });
});

describe("SubcategoriesTable", () => {
  it("renders indented child names and status chips", () => {
    render(
      <MantineProvider theme={theme}>
        <SubcategoriesTable
          rows={[
            {
              category: {
                id: "pay",
                name: "Paycheck",
                isParent: false,
                parentCategoryId: "income",
                isDisabled: false,
                categoryKind: CategoryKind.Income,
              },
              depth: 0,
            },
          ]}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Paycheck")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});
