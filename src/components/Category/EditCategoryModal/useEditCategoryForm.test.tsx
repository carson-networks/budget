import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryKind, type Category } from "../../../models";
import { useEditCategoryForm } from "./useEditCategoryForm.js";

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

const housingParent: Category = {
  id: "housing",
  name: "Housing",
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
    categories: [foodParent, housingParent, groceries],
  }),
  useUpdateCategory: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

function fakeSubmitEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe("useEditCategoryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateMock.mockImplementation(
      (_body: unknown, opts?: { onSuccess?: () => void }) => {
        opts?.onSuccess?.();
      },
    );
  });

  it("initializes fields from the category", () => {
    const { result } = renderHook(() =>
      useEditCategoryForm(groceries, vi.fn()),
    );

    expect(result.current.name).toBe("Groceries");
    expect(result.current.isDisabled).toBe(false);
    expect(result.current.parentCategoryId).toBe("food");
    expect(result.current.isFormValid).toBe(true);
  });

  it("exposes top-level parents as options, excluding the category itself", () => {
    const { result } = renderHook(() =>
      useEditCategoryForm(foodParent, vi.fn()),
    );

    expect(result.current.parentOptions).toEqual([
      { value: "housing", label: "Housing" },
    ]);
  });

  it("submits name, disabled, and parent when a parent is selected", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useEditCategoryForm(groceries, onClose),
    );

    act(() => {
      result.current.setName("  Produce  ");
      result.current.setIsDisabled(true);
      result.current.setParentCategoryId("housing");
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).toHaveBeenCalledWith(
      {
        id: "groceries",
        name: "Produce",
        isDisabled: true,
        parentCategoryId: "housing",
      },
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("omits parentCategoryId when parent is cleared (top-level)", () => {
    const { result } = renderHook(() =>
      useEditCategoryForm(groceries, vi.fn()),
    );

    act(() => {
      result.current.setParentCategoryId(null);
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).toHaveBeenCalledWith(
      {
        id: "groceries",
        name: "Groceries",
        isDisabled: false,
        parentCategoryId: undefined,
      },
      expect.any(Object),
    );
  });

  it("does not mutate when name is blank", () => {
    const { result } = renderHook(() =>
      useEditCategoryForm(groceries, vi.fn()),
    );

    act(() => {
      result.current.setName("   ");
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("handleClose resets the mutation and calls onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useEditCategoryForm(groceries, onClose),
    );

    act(() => {
      result.current.handleClose();
    });

    expect(resetMock).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
