import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryType } from "../../../connectRPC/types.js";
import { CategoryKind, type Category } from "../../../models";

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

vi.mock("../../../hooks/useCategories.js", () => ({
  useAllCategories: () => ({
    categories: [foodParent],
  }),
  useCreateCategory: () => ({
    mutate: mutateMock,
    reset: resetMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { useCreateCategoryForm } from "./useCreateCategoryForm.js";

function fakeSubmitEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
}

describe("useCreateCategoryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateMock.mockImplementation(
      (_body: unknown, opts?: { onSuccess?: () => void }) => {
        opts?.onSuccess?.();
      },
    );
  });

  it("is valid once a non-empty name and type are set", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(vi.fn()),
    );

    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setName("  Bills  ");
    });
    expect(result.current.isFormValid).toBe(true);
  });

  it("submits a top-level parent when no nest-under parent is selected", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCreateCategoryForm(onClose),
    );

    act(() => {
      result.current.setName("  Housing  ");
      result.current.setCategoryType(String(CategoryType.INCOME));
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).toHaveBeenCalledWith(
      {
        name: "Housing",
        isParent: true,
        parentCategoryId: undefined,
        isDisabled: false,
        categoryType: CategoryType.INCOME,
      },
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("submits a leaf under a selected parent with isParent false", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(vi.fn()),
    );

    act(() => {
      result.current.setName("Rent");
      result.current.setParentCategoryId("food");
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).toHaveBeenCalledWith(
      {
        name: "Rent",
        isParent: false,
        parentCategoryId: "food",
        isDisabled: false,
        categoryType: CategoryType.EXPENSE,
      },
      expect.any(Object),
    );
  });

  it("does not call mutate when name is empty", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(vi.fn()),
    );

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("exposes top-level categories as parent options", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(vi.fn()),
    );

    expect(result.current.parentOptions).toEqual([
      { value: "food", label: "Food" },
    ]);
  });

  it("handleClose resets fields, mutation, and calls onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCreateCategoryForm(onClose),
    );

    act(() => {
      result.current.setName("Temp");
      result.current.setParentCategoryId("food");
    });

    act(() => {
      result.current.handleClose();
    });

    expect(resetMock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(result.current.name).toBe("");
    expect(result.current.parentCategoryId).toBeNull();
    expect(result.current.categoryType).toBe(String(CategoryType.EXPENSE));
  });
});
