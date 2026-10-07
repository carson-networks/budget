import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";
import EditCategoryModal from "./Modal.js";

const { mutateMock, resetMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  resetMock: vi.fn(),
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

vi.mock("../../../hooks/useCategories.js", () => ({
  useAllCategories: () => ({
    categories: [foodParent, groceries],
  }),
  useUpdateCategory: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe("EditCategoryModal", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    resetMock.mockReset();
  });

  it("renders editable category settings when open", () => {
    render(
      <MantineProvider theme={theme}>
        <EditCategoryModal category={groceries} open onClose={vi.fn()} />
      </MantineProvider>,
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
    render(
      <MantineProvider theme={theme}>
        <EditCategoryModal category={null} open={false} onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(
      screen.queryByRole("heading", { name: "Category settings" }),
    ).not.toBeInTheDocument();
  });

  it("saves edited fields through updateCategory", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mutateMock.mockImplementation(
      (_body: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    render(
      <MantineProvider theme={theme}>
        <EditCategoryModal category={groceries} open onClose={onClose} />
      </MantineProvider>,
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "Produce");
    await user.click(screen.getByRole("checkbox", { name: /disabled/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "groceries",
        name: "Produce",
        isDisabled: true,
        parentCategoryId: "food",
      }),
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not mutate when the form is submitted while invalid", () => {
    render(
      <MantineProvider theme={theme}>
        <EditCategoryModal
          category={{ ...groceries, name: "" }}
          open
          onClose={vi.fn()}
        />
      </MantineProvider>,
    );

    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("keeps Save disabled when name is only whitespace", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <EditCategoryModal category={groceries} open onClose={vi.fn()} />
      </MantineProvider>,
    );

    const nameInput = screen.getByRole("textbox", { name: /name/i });
    await user.clear(nameInput);
    await user.type(nameInput, "   ");

    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeDisabled();
  });
});
