import { MantineProvider, Modal } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../theme.js";
import { DeleteConfirmModal } from "./DeleteConfirmModal.js";

function renderModal(
  props: Partial<ComponentProps<typeof DeleteConfirmModal>> = {},
) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    message: "Delete this account?",
    onConfirm: vi.fn(),
  };
  return {
    ...defaults,
    ...props,
    result: render(
      <MantineProvider theme={theme}>
        <Modal.Stack>
          <DeleteConfirmModal {...defaults} {...props} />
        </Modal.Stack>
      </MantineProvider>,
    ),
  };
}

describe("DeleteConfirmModal", () => {
  it("renders title, message, and actions when open", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Delete account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete this account?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("does not show the dialog when closed", () => {
    renderModal({ open: false });

    expect(
      screen.queryByRole("heading", { name: "Delete account" }),
    ).not.toBeInTheDocument();
  });

  it("calls onClose from Cancel and onConfirm from Delete", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    renderModal({ onClose, onConfirm });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables Delete when canDelete is false", () => {
    renderModal({ canDelete: false });
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
