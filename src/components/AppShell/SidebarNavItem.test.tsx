import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../theme.js";
import { SidebarNavItem } from "./SidebarNavItem.js";

describe("SidebarNavItem", () => {
  it("invokes onClick when the nav item is activated", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <SidebarNavItem
          label="Budget"
          icon={<span aria-hidden>*</span>}
          active={false}
          onClick={onClick}
          showLabels
        />
      </MantineProvider>,
    );

    const label = screen.getByText("Budget", {
      selector: ".mantine-NavLink-label",
    });
    const control = label.closest("a");
    expect(control).toBeTruthy();
    await user.click(control!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes aria-label when labels are hidden for icon-only mode", () => {
    render(
      <MantineProvider theme={theme} forceColorScheme="dark">
        <SidebarNavItem
          label="Budget"
          icon={<span aria-hidden>*</span>}
          active={false}
          onClick={vi.fn()}
          showLabels={false}
        />
      </MantineProvider>,
    );
    expect(screen.getByLabelText("Budget")).toBeInTheDocument();
  });
});
