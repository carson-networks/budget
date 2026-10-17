import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../theme.js";
import { NeedsReviewToggle } from "./NeedsReviewToggle.js";

function renderToggle(active: boolean, onToggle = vi.fn()) {
  render(
    <MantineProvider theme={theme} env="test">
      <NeedsReviewToggle active={active} onToggle={onToggle} />
    </MantineProvider>,
  );
  return onToggle;
}

describe("NeedsReviewToggle", () => {
  it("turns the filter on when it is off", async () => {
    const onToggle = renderToggle(false);
    const button = screen.getByRole("button", { name: "Needs review" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("turns the filter off when it is on", async () => {
    const onToggle = renderToggle(true);
    const button = screen.getByRole("button", { name: "Needs review" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(false);
  });
});
