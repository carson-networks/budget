import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../../../theme.js";
import { MonthNavigationBar } from "./MonthNavigationBar.js";

const checkboxName = "Apply budget changes to following months";

describe("MonthNavigationBar", () => {
  it("shows the month label and invokes prev/next/today handlers", async () => {
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
          showApplyToFollowingMonths
          applyToFollowingMonths={false}
          onApplyToFollowingMonthsChange={onApplyToFollowingMonthsChange}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Mar 2025")).toBeInTheDocument();

    const followCheckbox = screen.getByRole("checkbox", {
      name: checkboxName,
    });
    expect(followCheckbox).not.toBeChecked();

    await user.click(followCheckbox);
    expect(onApplyToFollowingMonthsChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(onPrev).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
    expect(onGoToToday).toHaveBeenCalledOnce();
  });

  it("hides the follow-months checkbox for past months", () => {
    render(
      <MantineProvider theme={theme}>
        <MonthNavigationBar
          selectedMonth={{ year: 2025, month: 2 }}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          onGoToToday={vi.fn()}
          showApplyToFollowingMonths={false}
          applyToFollowingMonths={true}
          onApplyToFollowingMonthsChange={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(
      screen.queryByRole("checkbox", { name: checkboxName }),
    ).not.toBeInTheDocument();
  });
});
