import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryType } from "../../../connectRPC/types.js";
import { CategoryKind, type Category } from "../../../models";
import { theme } from "../../../theme.js";
import CreateCategoryModal from "./Modal.js";

const { mutateMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
}));

const foodParent: Category = {
  id: "food",
  name: "Food",
  isParent: true,
  isDisabled: false,
  categoryKind: CategoryKind.Expense,
};

vi.mock("../../../hooks/useCategories.js", () => ({
  useAllCategories: () => ({
    categories: [foodParent],
  }),
  useCreateCategory: () => ({
    mutate: mutateMock,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe("CreateCategoryModal", () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it("enables Create once name is set", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    const submit = screen.getByRole("button", { name: /create category/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Housing");
    expect(submit).not.toBeDisabled();
  });

  it("submits a top-level parent when no nest-under parent is selected", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Housing");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Housing",
        isParent: true,
        isDisabled: false,
        categoryType: CategoryType.EXPENSE,
      }),
      expect.any(Object),
    );
  });

  it("does not mutate when the form is submitted while invalid", () => {
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("keeps Create disabled when name is only whitespace", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "   ");

    expect(
      screen.getByRole("button", { name: /create category/i }),
    ).toBeDisabled();
  });
});
