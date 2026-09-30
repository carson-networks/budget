import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

function parentCategoryCheckbox() {
  return screen.getByRole("checkbox", { name: /parent category/i });
}

describe("CreateCategoryModal", () => {
  beforeEach(() => {
    mutateMock.mockReset();
  });

  it("does not show a Disabled checkbox on create", () => {
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    expect(
      screen.queryByRole("checkbox", { name: /^disabled$/i }),
    ).not.toBeInTheDocument();
  });

  it("places the Parent category checkbox above the parent dropdown", () => {
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    const dialog = screen.getByRole("dialog");
    const checkbox = within(dialog).getByRole("checkbox", {
      name: /parent category/i,
    });
    const nestSelect = within(dialog).getByRole("textbox", {
      name: /parent category/i,
    });

    expect(
      checkbox.compareDocumentPosition(nestSelect) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("disables Create until name and parent category or nest-under are set", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    const submit = screen.getByRole("button", { name: /create category/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Housing");
    expect(submit).toBeDisabled();

    await user.click(parentCategoryCheckbox());
    expect(submit).not.toBeDisabled();
  });

  it("submits a parent category to the create mutation", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Housing");
    await user.click(parentCategoryCheckbox());
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

  it("does not mutate when the form is submitted while invalid", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider theme={theme}>
        <CreateCategoryModal open onClose={vi.fn()} />
      </MantineProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Only name");
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
    await user.click(parentCategoryCheckbox());

    expect(
      screen.getByRole("button", { name: /create category/i }),
    ).toBeDisabled();
  });
});
