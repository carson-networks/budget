import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../models";
import { theme } from "../../theme.js";
import { CategorySelect } from "./CategorySelect.js";
import { buildTransactionCategorySelectData } from "./transactionCategorySelectData.js";

const categories: Category[] = [
  {
    id: "parent",
    name: "Food",
    isParent: true,
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
  },
  {
    id: "dining",
    name: "Dining",
    parentCategoryId: "parent",
    isParent: false,
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
  },
  {
    id: "groceries",
    name: "Groceries",
    parentCategoryId: "parent",
    isParent: false,
    isDisabled: false,
    categoryKind: CategoryKind.Expense,
  },
  {
    id: "disabled",
    name: "Disabled",
    parentCategoryId: "parent",
    isParent: false,
    isDisabled: true,
    categoryKind: CategoryKind.Expense,
  },
];

function renderSelect(
  props: Partial<ComponentProps<typeof CategorySelect>> = {},
) {
  return render(
    <MantineProvider theme={theme} env="test">
      <CategorySelect
        categories={categories}
        data={buildTransactionCategorySelectData(categories)}
        currentCategoryId="dining"
        pending={false}
        transactionName="Lunch"
        onCategoryChange={vi.fn()}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("CategorySelect", () => {
  it("displays the current category and sends only a changed category", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderSelect({ onCategoryChange });
    const input = screen.getByRole("textbox", { name: "Category for Lunch" });
    expect(input).toHaveValue("Dining");
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Dining" }));
    expect(onCategoryChange).not.toHaveBeenCalled();
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Groceries" }));
    expect(onCategoryChange).toHaveBeenCalledExactlyOnceWith("groceries");
  });

  it("groups options, excludes parents, and prevents selecting disabled leaves", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    renderSelect({ onCategoryChange });
    await user.click(screen.getByRole("textbox"));
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Food" }),
    ).not.toBeInTheDocument();
    const disabled = screen.getByRole("option", { name: "Disabled" });
    await user.click(disabled);
    expect(onCategoryChange).not.toHaveBeenCalled();
  });

  it("supports searching and reports an empty search result", async () => {
    const user = userEvent.setup();
    renderSelect({ currentCategoryId: undefined });
    const input = screen.getByRole("textbox");
    await user.type(input, "Gro");
    expect(
      screen.getByRole("option", { name: "Groceries" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Dining" }),
    ).not.toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "nonexistent");
    expect(screen.getByText("No categories")).toBeInTheDocument();
  });

  it.each([undefined, "missing", "parent", "disabled"])(
    "shows Pick category for an unselectable current id (%s)",
    (currentCategoryId) => {
      renderSelect({ currentCategoryId });
      expect(screen.getByPlaceholderText("Pick category")).toHaveValue("");
    },
  );

  it("disables changes while saving", () => {
    renderSelect({ pending: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("disables changes when no active leaves exist", () => {
    const unavailable = categories.filter(
      (category) => category.isParent || category.isDisabled,
    );
    renderSelect({
      categories: unavailable,
      data: buildTransactionCategorySelectData(unavailable),
    });
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
