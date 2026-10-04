import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import {
  APPLY_TO_FOLLOWING_MONTHS_LABEL,
  MonthNavigationBar,
} from "./MonthNavigationBar.js";

/** Mantine keeps portaled dropdowns at display:none in jsdom until layout. */
const menuOpts = { hidden: true } as const;

describe("MonthNavigationBar", () => {
  it("shows the month label and toggles follow-months from the options menu", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onGoToToday = vi.fn();
    const onApplyToFollowingMonthsChange = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <MonthNavigationBar
          selectedMonth={{ year: 2025, month: 3 }}
          onPrev={onPrev}
          onNext={onNext}
          onGoToToday={onGoToToday}
          canApplyToFollowingMonths
          applyToFollowingMonths={false}
          onApplyToFollowingMonthsChange={onApplyToFollowingMonthsChange}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(onPrev).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
    expect(onGoToToday).toHaveBeenCalledOnce();
  });

  it("keeps the options menu but disables follow-months on past months", async () => {
    const user = userEvent.setup();
    const onApplyToFollowingMonthsChange = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <MonthNavigationBar
          selectedMonth={{ year: 2025, month: 2 }}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          onGoToToday={vi.fn()}
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
