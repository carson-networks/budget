import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";

vi.mock("../../../hooks/useCategories.js", () => ({
  useAllCategories: vi.fn(),
  useCreateCategory: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useUpdateCategory: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { useAllCategories } from "../../../hooks/useCategories.js";
import CategoriesView from "./CategoriesView.js";

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

function mockCategoryQuery(
  partial: Partial<ReturnType<typeof useAllCategories>>,
) {
  vi.mocked(useAllCategories).mockReturnValue({
    categories: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    status: "success",
    ...partial,
  } as ReturnType<typeof useAllCategories>);
}

function renderCategoriesView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <CategoriesView />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe("CategoriesView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockCategoryQuery({
      categories: [],
      isLoading: false,
      error: null,
    });
  });

  it("shows loading state while categories are loading", () => {
    mockCategoryQuery({ isLoading: true, categories: [] });

    renderCategoriesView();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Categories" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error alert when the categories query fails", () => {
    mockCategoryQuery({
      isLoading: false,
      error: new Error("network failed"),
      categories: [],
    });

    renderCategoriesView();

    expect(screen.getByText("network failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows an empty-state hint when there are no categories", () => {
    renderCategoriesView();

    expect(screen.getByText("No categories yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Categories" }),
    ).toBeInTheDocument();
  });

  it("renders parent segments and subcategory rows", () => {
    mockCategoryQuery({ categories: [foodParent, groceries] });

    renderCategoriesView();

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Expense")).toBeInTheDocument();
    expect(screen.getAllByText("Enabled").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("No categories yet.")).not.toBeInTheDocument();
  });

  it("shows no-subcategories message for empty parents", () => {
    mockCategoryQuery({ categories: [foodParent] });

    renderCategoriesView();

    expect(screen.getByText("No subcategories")).toBeInTheDocument();
  });

  it("opens the create category modal from the add category button", async () => {
    const user = userEvent.setup();
    renderCategoriesView();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("New Category")).toBeInTheDocument();
  });

  it("opens category settings from a parent settings button", async () => {
    const user = userEvent.setup();
    mockCategoryQuery({ categories: [foodParent, groceries] });
    renderCategoriesView();

    await user.click(
      screen.getByRole("button", { name: "Settings for Food" }),
    );

    expect(
      screen.getByRole("heading", { name: "Category settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue("Food");
  });

  it("opens category settings from a subcategory settings button", async () => {
    const user = userEvent.setup();
    mockCategoryQuery({ categories: [foodParent, groceries] });
    renderCategoriesView();

    await user.click(
      screen.getByRole("button", { name: "Settings for Groceries" }),
    );

    expect(
      screen.getByRole("heading", { name: "Category settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "Groceries",
    );
  });
});
