import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { MonthOptionsMenu } from "./MonthOptionsMenu.js";

/** Mantine keeps portaled dropdowns at display:none in jsdom until layout. */
const menuOpts = { hidden: true } as const;

const followMonthsLabel = "Apply budget changes to following months";

describe("MonthOptionsMenu", () => {
  it("toggles apply-to-following-months from the options menu", async () => {
    const user = userEvent.setup();
    const onApplyToFollowingMonthsChange = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <MonthOptionsMenu
          canApplyToFollowingMonths
          applyToFollowingMonths={false}
          onApplyToFollowingMonthsChange={onApplyToFollowingMonthsChange}
        />
      </MantineProvider>,
    );

    expect(
      screen.queryByRole("menuitem", {
        name: followMonthsLabel,
        ...menuOpts,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Month options" }));
    const followItem = await screen.findByRole("menuitem", {
      name: followMonthsLabel,
      ...menuOpts,
    });
    expect(followItem).toBeEnabled();
    await user.click(followItem);
    expect(onApplyToFollowingMonthsChange).toHaveBeenCalledWith(true);
  });

  it("disables follow-months when the selected month is in the past", async () => {
    const user = userEvent.setup();
    const onApplyToFollowingMonthsChange = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <MonthOptionsMenu
          canApplyToFollowingMonths={false}
          applyToFollowingMonths={true}
          onApplyToFollowingMonthsChange={onApplyToFollowingMonthsChange}
        />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Month options" }));
    const followItem = await screen.findByRole("menuitem", {
      name: followMonthsLabel,
      ...menuOpts,
    });
    expect(followItem).toHaveAttribute("data-disabled", "true");
    await user.click(followItem);
    expect(onApplyToFollowingMonthsChange).not.toHaveBeenCalled();
  });
});
