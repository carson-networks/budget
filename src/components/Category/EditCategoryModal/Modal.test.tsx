import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryType } from "../../../connectRPC/types.js";
import { CategoryKind, type Category } from "../../../models";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import EditCategoryModal from "./Modal.js";

const api = vi.hoisted(() => ({
  updateCategory: vi.fn(),
  listCategories: vi.fn(),
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

const wire = (category: Category) => ({
  ...category,
  categoryType: CategoryType.EXPENSE,
});

describe("EditCategoryModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.updateCategory.mockResolvedValue({});
    api.listCategories.mockResolvedValue({
      categories: [
        wire(foodParent),
        wire(groceries),
        wire({ ...foodParent, id: "housing", name: "Housing" }),
      ],
    });
  });

  it("renders editable category settings when open", () => {
    renderWithProviders(
      <EditCategoryModal category={groceries} open onClose={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "Category settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "Groceries",
    );
    expect(screen.getByRole("checkbox", { name: /disabled/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("does not render when closed with a null category", () => {
    renderWithProviders(
      <EditCategoryModal category={null} open={false} onClose={vi.fn()} />,
    );

    expect(
      screen.queryByRole("heading", { name: "Category settings" }),
    ).not.toBeInTheDocument();
  });

  it("saves edited fields through updateCategory and closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <EditCategoryModal category={groceries} open onClose={onClose} />,
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "  Produce ");
    await user.click(screen.getByRole("checkbox", { name: /disabled/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(api.updateCategory).toHaveBeenCalledExactlyOnceWith({
      id: "groceries",
      name: "Produce",
      isDisabled: true,
      parentCategoryId: "food",
    });
  });

  it("shows the server error and stays open when saving fails", async () => {
    const user = userEvent.setup();
    api.updateCategory.mockRejectedValue(new Error("Save failed"));
    const onClose = vi.fn();
    renderWithProviders(
      <EditCategoryModal category={groceries} open onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not mutate when the form is submitted while invalid", () => {
    renderWithProviders(
      <EditCategoryModal
        category={{ ...groceries, name: "" }}
        open
        onClose={vi.fn()}
      />,
    );

    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(api.updateCategory).not.toHaveBeenCalled();
  });

  it("keeps Save disabled when name is only whitespace", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditCategoryModal category={groceries} open onClose={vi.fn()} />,
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "   ");

    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeDisabled();
  });
});
