import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../theme.js";
import { DeleteConfirmBar } from "./DeleteConfirmBar.js";

function renderBar(props: Partial<ComponentProps<typeof DeleteConfirmBar>> = {}) {
  const defaults = {
    armed: false,
    confirmMessage: "Delete this account?",
    armButtonLabel: "Delete account",
    onArm: vi.fn(),
    onDisarm: vi.fn(),
    onConfirmDelete: vi.fn(),
    canDelete: true,
    deletePending: false,
  };
  return {
    ...defaults,
    ...props,
    result: render(
      <MantineProvider theme={theme}>
        <DeleteConfirmBar {...defaults} {...props} />
      </MantineProvider>,
    ),
  };
}

describe("DeleteConfirmBar", () => {
  it("shows the arm button when not armed", () => {
    renderBar();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("calls onArm when the arm button is clicked", async () => {
    const user = userEvent.setup();
    const onArm = vi.fn();
    renderBar({ onArm });

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(onArm).toHaveBeenCalledOnce();
  });

  it("disables the arm button when canDelete is false", () => {
    renderBar({ canDelete: false });
    expect(screen.getByRole("button", { name: "Delete account" })).toBeDisabled();
  });

  it("shows confirm message and Cancel / Delete when armed", () => {
    renderBar({ armed: true });

    expect(screen.getByText("Delete this account?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls onDisarm and onConfirmDelete from the confirm row", async () => {
    const user = userEvent.setup();
    const onDisarm = vi.fn();
    const onConfirmDelete = vi.fn();
    renderBar({ armed: true, onDisarm, onConfirmDelete });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDisarm).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirmDelete).toHaveBeenCalledOnce();
  });
});
