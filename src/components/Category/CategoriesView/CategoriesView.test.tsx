import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import { wireCategory } from "../../../test/wire.js";
import CategoriesView from "./CategoriesView.js";

const api = vi.hoisted(() => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));
vi.mock("../../../connectRPC/connect.js", () => ({
  categoryClient: api,
}));

const foodParent: Category = {
  id: "food",
  name: "Food",
  isParent: true,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

const groceries: Category = {
  id: "groceries",
  name: "Groceries",
  isParent: false,
  parentCategoryId: "food",
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

function mockCategories(categories: Category[]) {
  api.listCategories.mockResolvedValue({
    categories: categories.map(wireCategory),
  });
}

function renderCategoriesView() {
  return renderWithProviders(<CategoriesView />);
}

describe("CategoriesView", () => {
  beforeEach(() => {
    api.listCategories.mockReset();
    mockCategories([]);
  });

  it("shows loading state while categories are loading", () => {
    api.listCategories.mockReturnValue(new Promise(() => {}));

    renderCategoriesView();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Categories" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error alert when the categories query fails", async () => {
    api.listCategories.mockRejectedValue(new Error("network failed"));

    renderCategoriesView();

    expect(await screen.findByText("network failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows an empty-state hint when there are no categories", async () => {
    renderCategoriesView();

    expect(await screen.findByText("No categories yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Categories" }),
    ).toBeInTheDocument();
  });

  it("renders parent segments and subcategory rows", async () => {
    mockCategories([foodParent, groceries]);

    renderCategoriesView();

    expect(await screen.findByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Expense")).toBeInTheDocument();
    expect(screen.getAllByText("Enabled").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("No categories yet.")).not.toBeInTheDocument();
  });

  it("shows no-subcategories message for empty parents", async () => {
    mockCategories([foodParent]);

    renderCategoriesView();

    expect(await screen.findByText("No subcategories")).toBeInTheDocument();
  });

  it("opens the create category modal from the add category button", async () => {
    const user = userEvent.setup();
    renderCategoriesView();

    await screen.findByText("No categories yet.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("New Category")).toBeInTheDocument();
  });

  it("opens category settings from a parent settings button", async () => {
    const user = userEvent.setup();
    mockCategories([foodParent, groceries]);
    renderCategoriesView();

    await user.click(
      await screen.findByRole("button", { name: "Settings for Food" }),
    );

    expect(
      screen.getByRole("heading", { name: "Category settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue("Food");
  });

  it("opens category settings from a subcategory settings button", async () => {
    const user = userEvent.setup();
    mockCategories([foodParent, groceries]);
    renderCategoriesView();

    await user.click(
      await screen.findByRole("button", { name: "Settings for Groceries" }),
    );

    expect(
      screen.getByRole("heading", { name: "Category settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "Groceries",
    );
  });
});
