import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { MonthNavigationBar } from "./MonthNavigationBar.js";

describe("MonthNavigationBar", () => {
  it("shows the month label, options menu, and invokes prev/next/today", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onGoToToday = vi.fn();

    render(
      <MantineProvider theme={theme}>
        <MonthNavigationBar
          selectedMonth={{ year: 2025, month: 3 }}
          onPrev={onPrev}
          onNext={onNext}
          onGoToToday={onGoToToday}
          canApplyToFollowingMonths
          applyToFollowingMonths={false}
          onApplyToFollowingMonthsChange={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Mar 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Month options" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(onPrev).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
    expect(onGoToToday).toHaveBeenCalledOnce();
  });
});
