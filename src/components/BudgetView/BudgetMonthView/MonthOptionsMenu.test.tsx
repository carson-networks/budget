import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import {
  APPLY_TO_FOLLOWING_MONTHS_LABEL,
  MonthOptionsMenu,
} from "./MonthOptionsMenu.js";

/** Mantine keeps portaled dropdowns at display:none in jsdom until layout. */
const menuOpts = { hidden: true } as const;

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
        name: APPLY_TO_FOLLOWING_MONTHS_LABEL,
        ...menuOpts,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Month options" }));
    const followItem = await screen.findByRole("menuitem", {
      name: APPLY_TO_FOLLOWING_MONTHS_LABEL,
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
      name: APPLY_TO_FOLLOWING_MONTHS_LABEL,
      ...menuOpts,
    });
    expect(followItem).toHaveAttribute("data-disabled", "true");
    await user.click(followItem);
    expect(onApplyToFollowingMonthsChange).not.toHaveBeenCalled();
  });
});
