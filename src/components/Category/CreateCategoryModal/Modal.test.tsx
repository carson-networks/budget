import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryType } from "../../../connectRPC/types.js";
import { renderWithProviders } from "../../../test/renderWithProviders.js";
import CreateCategoryModal from "./Modal.js";

const api = vi.hoisted(() => ({
  createCategory: vi.fn(),
  listCategories: vi.fn(),
}));

vi.mock("../../../connectRPC/connect.js", () => ({
  categoryClient: api,
}));

function renderModal(onClose = vi.fn()) {
  renderWithProviders(<CreateCategoryModal open onClose={onClose} />);
  return onClose;
}

describe("CreateCategoryModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.createCategory.mockResolvedValue({});
    api.listCategories.mockResolvedValue({
      categories: [
        {
          id: "food",
          name: "Food",
          isParent: true,
          isDisabled: false,
          categoryType: CategoryType.EXPENSE,
        },
      ],
    });
  });

  it("enables Create once name is set", async () => {
    const user = userEvent.setup();
    renderModal();

    const submit = screen.getByRole("button", { name: /create category/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Housing");
    expect(submit).not.toBeDisabled();
  });

  it("submits a trimmed top-level parent when no parent is selected, then closes", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.type(
      screen.getByRole("textbox", { name: /name/i }),
      "  Housing ",
    );
    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.createCategory).toHaveBeenCalledExactlyOnceWith({
      name: "Housing",
      isParent: true,
      parentCategoryId: undefined,
      isDisabled: false,
      categoryType: CategoryType.EXPENSE,
    });
  });

  it("submits a leaf under a selected parent", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Rent");
    await user.click(
      await screen.findByRole("textbox", { name: /parent category/i }),
    );
    await user.click(await screen.findByRole("option", { name: "Food" }));
    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() =>
      expect(api.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rent",
          isParent: false,
          parentCategoryId: "food",
        }),
      ),
    );
  });

  it("clears the fields after closing", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Temp");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(""),
    );
  });

  it("shows the server error and keeps the form open", async () => {
    const user = userEvent.setup();
    api.createCategory.mockRejectedValue(new Error("Name taken"));
    const onClose = renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Dup");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    expect(await screen.findByText("Name taken")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not mutate when the form is submitted while invalid", () => {
    renderModal();

    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(api.createCategory).not.toHaveBeenCalled();
  });

  it("keeps Create disabled when name is only whitespace", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "   ");

    expect(
      screen.getByRole("button", { name: /create category/i }),
    ).toBeDisabled();
  });
});
