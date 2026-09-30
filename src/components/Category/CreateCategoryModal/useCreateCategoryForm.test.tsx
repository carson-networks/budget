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

  it("starts invalid until name is set and group or parent is chosen", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, vi.fn()),
    );

    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setName("  Bills  ");
    });
    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.setIsGroup(true);
    });
    expect(result.current.isFormValid).toBe(true);
  });

  it("becomes valid when a parent is selected instead of group", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, vi.fn()),
    );

    act(() => {
      result.current.setName("Groceries");
      result.current.setParentCategoryId("food");
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it("does not mutate standalone leaf submissions", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, vi.fn()),
    );

    act(() => {
      result.current.setName("Orphan");
    });

    act(() => {
      result.current.handleSubmit(fakeSubmitEvent());
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("submits a group category and closes on success", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, onClose),
    );

    act(() => {
      result.current.setName("  Housing  ");
      result.current.setIsGroup(true);
      result.current.setIsDisabled(true);
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
        isDisabled: true,
        categoryType: CategoryType.INCOME,
      },
      expect.any(Object),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("submits a leaf under a parent with isParent false", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, vi.fn()),
    );

    act(() => {
      result.current.setName("Rent");
      result.current.setParentCategoryId("food");
      result.current.setIsGroup(true);
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

  it("exposes top-level categories as parent options", () => {
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, vi.fn()),
    );

    expect(result.current.parentOptions).toEqual([
      { value: "food", label: "Food" },
    ]);
  });

  it("handleClose resets fields, mutation, and calls onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useCreateCategoryForm(true, onClose),
    );

    act(() => {
      result.current.setName("Temp");
      result.current.setIsGroup(true);
      result.current.setIsDisabled(true);
    });

    act(() => {
      result.current.handleClose();
    });

    expect(resetMock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(result.current.name).toBe("");
    expect(result.current.isGroup).toBe(false);
    expect(result.current.isDisabled).toBe(false);
    expect(result.current.categoryType).toBe(String(CategoryType.EXPENSE));
  });

  it("calls reset when open becomes false", () => {
    const { rerender } = renderHook(
      ({ open }) => useCreateCategoryForm(open, vi.fn()),
      { initialProps: { open: true } },
    );

    rerender({ open: false });

    expect(resetMock).toHaveBeenCalled();
  });
});
