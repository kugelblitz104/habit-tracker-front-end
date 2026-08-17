import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { TrackerStatus } from '@/types/types';

import { authHeaders, type Account } from '../fixtures/api';
import { dayFrom } from '../fixtures/clock';
import { GOLDEN, GOLDEN_PROFILE_NAME } from '../fixtures/golden-profile';
import { appHeader, expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The four Insights charts, ahead of a shared `ChartCard` + recharts tooltip
 * theme extraction.
 *
 * `no-fragment-warning.spec.ts` already *visits* /insights, but it only greps
 * the console for one Headless UI message — a render crash there would leave it
 * green — so this surface is effectively uncovered.
 *
 * Every figure below is derived from the golden dataset rather than read off the
 * screen:
 *  - Tasks completed: only `GOLDEN.tasks.closed` is DONE at top level (the done
 *    SUBTASK is filtered out by `parent_id == null`), closed 2 days ago -> 1.
 *  - Time tracked: 1h + 30m on Alpha and 45m on Beta = 8100s = "2h 15m", which
 *    is also the "Time by project" total.
 *  - Open now: 8 open top-level tasks (DEFERRED counts as open, DONE does not),
 *    none with a due date -> "none overdue".
 *  - Habit completion rates come from the CLIENT (`kpi-utils`), mirroring the
 *    backend's `_completion_rate`: only COMPLETED days count (no auto-skip
 *    credit), the denominator is `window_days * frequency / range`, and the
 *    result is capped at 100%. The window is exactly 30 days, `[today-29,
 *    today]` inclusive.
 *    - Daily (frequency=1, range=1): completions on -1..-7 (7 days, -4
 *      SKIPPED so only 6 count) plus -9..-16 (8 days, all completed) = 14
 *      completions, all inside the window. expected = 30*1/1 = 30.
 *      14/30 -> 46.67% -> 47%.
 *    - Thrice-weekly (frequency=3, range=7): 3 completions on -2/-4/-6, all
 *      inside the window. expected = 30*3/7 = 12.857. 3/12.857 -> 23.33%
 *      -> 23%.
 *    - Lapsed (frequency=1, range=1): one completion 45 days back, outside
 *      the 30-day window -> 0 actual -> 0%.
 *    Average (47+23+0)/3 = 23.33% -> 23%. Only the thrice-weekly habit's
 *    streak reaches today (auto-skip), so exactly one habit is "on streak".
 *  - Streaks, unlike the rates, come from the SERVER KPI over full history, so
 *    they do not shrink with the range toggle. Golden's streaks all sit inside
 *    the 7-day window, so the last test seeds a longer one of its own.
 *
 * The chart `<section>`s are the only sections on the page, so a section
 * containing a given `<h2>` is an exact, testid-free handle on one chart card —
 * needed because "No time tracked in this window." is rendered by two of them.
 */

const EMPTY_PROFILE = 'E2E Empty';
const SPARSE_PROFILE = 'E2E Sparse';
const RANKED_PROFILE = 'E2E Ranked';

/** The habit chart's cap. Mirrors `HABIT_ROWS` in `use-insights-data.ts`. */
const HABIT_ROWS = 5;
/** Days in the seeded streak: longer than the 7-day range, which is the point. */
const STREAK_DAYS = 12;

const CHART_TITLES = [
    'Tasks completed',
    'Time tracked',
    'Habit completion',
    'Time by project'
] as const;

/** One chart card, identified by the `<h2>` it contains. */
const chartCard = (page: Page, title: string): Locator =>
    page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

/** A chart's right-aligned figure — the span beside its title. */
const chartFigure = (page: Page, title: string): Locator =>
    chartCard(page, title)
        .getByRole('heading', { name: title, exact: true })
        .locator('xpath=following-sibling::span[1]');

/** A summary stat card's value. Level 3 keeps it off the chart `<h2>`s. */
const summaryValue = (page: Page, label: string): Locator =>
    page
        .getByRole('heading', { name: label, exact: true, level: 3 })
        .locator('xpath=following-sibling::div[1]');

/** A summary stat card's sub-label. */
const summarySub = (page: Page, label: string): Locator =>
    page
        .getByRole('heading', { name: label, exact: true, level: 3 })
        .locator('xpath=following-sibling::p[1]');

/** Create an extra profile on the account (insights on, so the route resolves). */
const createProfile = async (
    api: APIRequestContext,
    account: Account,
    name: string
): Promise<number> => {
    const response = await api.post('/profiles/', {
        headers: authHeaders(account),
        data: { name, insights_enabled: true, habits_enabled: true, countdowns_enabled: true }
    });
    expect(
        response.ok(),
        `POST /profiles/ failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    return (await response.json()).id;
};

/**
 * Create a daily habit (frequency 1 / range 1, so auto-skip never applies and a
 * streak survives only while today is completed) with one COMPLETED tracker per
 * entry in `daysBack`.
 */
const seedHabit = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    anchor: Date,
    name: string,
    daysBack: number[]
): Promise<void> => {
    const habit = await api.post('/habits/', {
        headers: authHeaders(account),
        data: {
            profile_id: profileId,
            name,
            question: `Did you do ${name}?`,
            color: '#33cc88',
            frequency: 1,
            range: 1
        }
    });
    expect(
        habit.ok(),
        `POST /habits/ failed: ${habit.status()} ${await habit.text()}`
    ).toBeTruthy();
    const habitId: number = (await habit.json()).id;

    for (const back of daysBack) {
        const tracker = await api.post('/trackers/', {
            headers: authHeaders(account),
            data: {
                habit_id: habitId,
                dated: dayFrom(anchor, -back),
                status: TrackerStatus.COMPLETED
            }
        });
        expect(
            tracker.ok(),
            `POST /trackers/ failed: ${tracker.status()} ${await tracker.text()}`
        ).toBeTruthy();
    }
};

/** Switch the active profile through the header pill, as a user would. */
const switchProfile = async (page: Page, from: string, to: string): Promise<void> => {
    await appHeader(page).getByRole('button', { name: from }).click();
    await page.getByRole('menuitem', { name: to }).click();
    await expect(appHeader(page).getByRole('button', { name: to })).toBeVisible();
};

test('all four charts render with their titles and figures', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/insights');

    await expect(authedPage.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible();
    await expect(authedPage.getByText('Your last 30 days at a glance')).toBeVisible();

    for (const title of CHART_TITLES) {
        await expect(chartCard(authedPage, title), `${title} chart missing`).toHaveCount(1);
    }

    // --- throughput ---
    await expect(chartFigure(authedPage, 'Tasks completed')).toHaveText('1 total');
    await expect(summaryValue(authedPage, 'Tasks completed')).toHaveText('1');

    // --- tracked time: 1h + 30m + 45m ---
    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('2h 15m');
    await expect(summaryValue(authedPage, 'Time tracked')).toHaveText('2h 15m');

    // --- the same total, split by project ---
    await expect(chartFigure(authedPage, 'Time by project')).toHaveText('2h 15m');
    const projectLegend = chartCard(authedPage, 'Time by project').getByRole('listitem');
    await expect(projectLegend).toHaveCount(2);
    await expect(projectLegend.filter({ hasText: GOLDEN.projects.alpha })).toContainText('1h 30m');
    await expect(projectLegend.filter({ hasText: GOLDEN.projects.beta })).toContainText('45m');

    // --- habits ---
    await expect(chartFigure(authedPage, 'Habit completion')).toHaveText('3 habits');
    const habitRows = chartCard(authedPage, 'Habit completion').getByRole('listitem');
    await expect(habitRows).toHaveCount(3);
    // Sorted by streak descending, completion rate breaking ties. Only the
    // thrice-weekly habit's streak reaches today (today is auto-skipped because
    // three completions already sit inside its 7-day window), so it leads
    // despite the lower rate; the other two are ranked by rate alone.
    await expect(habitRows.nth(0)).toContainText(GOLDEN.habits.thrice);
    await expect(habitRows.nth(0)).toContainText('23%');
    await expect(habitRows.nth(1)).toContainText(GOLDEN.habits.daily);
    await expect(habitRows.nth(1)).toContainText('47%');
    await expect(habitRows.nth(2)).toContainText(GOLDEN.habits.paused);
    await expect(habitRows.nth(2)).toContainText('0%');

    // ...so it is the only row wearing a flame.
    await expect(habitRows.nth(0).getByTitle('3-day streak')).toBeVisible();
    await expect(habitRows.nth(1).getByTitle(/-day streak$/)).toHaveCount(0);
    await expect(habitRows.nth(2).getByTitle(/-day streak$/)).toHaveCount(0);
    await expect(summaryValue(authedPage, 'Habit completion')).toHaveText('23%');
    await expect(summaryValue(authedPage, 'Habits on streak')).toHaveText('1');
    await expect(summarySub(authedPage, 'Habits on streak')).toHaveText('of 3');

    // --- point-in-time backlog ---
    await expect(summaryValue(authedPage, 'Open now')).toHaveText('8');
    await expect(summarySub(authedPage, 'Open now')).toHaveText('none overdue');
});

test('the 7-day range keeps the seeded totals and relabels the header', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/insights');
    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('2h 15m');

    const sevenDays = authedPage.getByRole('tab', { name: '7 days' });
    await expect(sevenDays).toHaveAttribute('aria-selected', 'false');
    await sevenDays.click();
    await expect(sevenDays).toHaveAttribute('aria-selected', 'true');

    await expect(authedPage.getByText('Your last 7 days at a glance')).toBeVisible();
    // Both time entries and the one closed task fall inside the last 7 days, so
    // the totals are unchanged — only the bucketing (daily, not weekly) is. The
    // charts stay mounted across the switch rather than flashing a skeleton.
    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('2h 15m');
    await expect(chartFigure(authedPage, 'Tasks completed')).toHaveText('1 total');
    await expect(chartFigure(authedPage, 'Time by project')).toHaveText('2h 15m');
    // The habit COUNT isn't windowed (only each habit's rate is).
    await expect(chartFigure(authedPage, 'Habit completion')).toHaveText('3 habits');
});

test('a profile with nothing in it shows the page-level empty state', async ({
    api,
    account,
    authedPage
}) => {
    await createProfile(api, account, EMPTY_PROFILE);
    await gotoAppRoute(authedPage, '/insights');
    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('2h 15m');

    await switchProfile(authedPage, GOLDEN_PROFILE_NAME, EMPTY_PROFILE);

    // `hasAnyData` is false when there are no completions, no tracked time, no
    // habits AND no open tasks — so the page swaps every chart for one message
    // rather than rendering four empty cards.
    await expect(authedPage.getByText('Nothing to show yet')).toBeVisible();
    await expect(
        authedPage.getByText(
            'Complete tasks, track time, or check off habits and your trends will appear here.'
        )
    ).toBeVisible();
    for (const title of CHART_TITLES) {
        await expect(chartCard(authedPage, title), `${title} should not render`).toHaveCount(0);
    }
});

test('each chart renders its own empty message when the window holds no data', async ({
    api,
    account,
    authedPage
}) => {
    // A single OPEN task is the cheapest way past `hasAnyData` (it counts
    // `openCount`) without giving any chart something to plot — which is what
    // gets all four empty states on screen at once.
    const profileId = await createProfile(api, account, SPARSE_PROFILE);
    const task = await api.post('/tasks/', {
        headers: authHeaders(account),
        data: { profile_id: profileId, title: 'Nothing tracked against this' }
    });
    expect(task.ok(), `POST /tasks/ failed: ${task.status()}`).toBeTruthy();

    await gotoAppRoute(authedPage, '/insights');
    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('2h 15m');

    await switchProfile(authedPage, GOLDEN_PROFILE_NAME, SPARSE_PROFILE);

    await expect(summaryValue(authedPage, 'Open now')).toHaveText('1');

    await expect(chartFigure(authedPage, 'Tasks completed')).toHaveText('0 total');
    await expect(chartCard(authedPage, 'Tasks completed')).toContainText(
        'No tasks completed in this window.'
    );

    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('0m');
    await expect(chartCard(authedPage, 'Time tracked')).toContainText(
        'No time tracked in this window.'
    );

    await expect(chartFigure(authedPage, 'Habit completion')).toHaveText('0 habits');
    await expect(chartCard(authedPage, 'Habit completion')).toContainText('No active habits.');

    await expect(chartFigure(authedPage, 'Time by project')).toHaveText('0m');
    await expect(chartCard(authedPage, 'Time by project')).toContainText(
        'No time tracked in this window.'
    );

    // No habits in this profile, so those two stat cards drop out entirely
    // rather than showing hollow zeros.
    await expect(
        authedPage.getByRole('heading', { name: 'Habit completion', exact: true, level: 3 })
    ).toHaveCount(0);
    await expect(
        authedPage.getByRole('heading', { name: 'Habits on streak', exact: true, level: 3 })
    ).toHaveCount(0);
});

test('the habit chart keeps the top 5 by streak and shows the streak in full', async ({
    api,
    account,
    anchor,
    authedPage
}) => {
    const profileId = await createProfile(api, account, RANKED_PROFILE);
    // Six habits for five rows, so the cap has something to drop. The leader is
    // the only one completed TODAY, so it is the only one with a live streak and
    // must lead despite `Ranked five` having the same rate over the window.
    const leaderDays = [...Array(STREAK_DAYS).keys()]; // 0 (today) .. 11
    await seedHabit(api, account, profileId, anchor, 'Ranked leader', leaderDays);
    for (const [name, completions] of [
        ['Ranked five', 5],
        ['Ranked four', 4],
        ['Ranked three', 3],
        ['Ranked two', 2],
        ['Ranked one', 1]
    ] as const) {
        // Starts at yesterday, so today is never completed and none of these
        // carries a streak, so they rank by completion rate alone.
        const days = [...Array(completions).keys()].map((i) => i + 1);
        await seedHabit(api, account, profileId, anchor, name, days);
    }

    await gotoAppRoute(authedPage, '/insights');
    await expect(chartFigure(authedPage, 'Time tracked')).toHaveText('2h 15m');
    await switchProfile(authedPage, GOLDEN_PROFILE_NAME, RANKED_PROFILE);

    const habitRows = chartCard(authedPage, 'Habit completion').getByRole('listitem');
    await expect(chartFigure(authedPage, 'Habit completion')).toHaveText('top 5 of 6');
    await expect(habitRows).toHaveCount(HABIT_ROWS);
    // Streak first, then completion rate, so the one-completion habit is the
    // row that falls off the end.
    await expect(habitRows.nth(0)).toContainText('Ranked leader');
    await expect(habitRows.nth(1)).toContainText('Ranked five');
    await expect(habitRows.nth(2)).toContainText('Ranked four');
    await expect(habitRows.nth(3)).toContainText('Ranked three');
    await expect(habitRows.nth(4)).toContainText('Ranked two');
    await expect(chartCard(authedPage, 'Habit completion').getByText('Ranked one')).toHaveCount(0);

    // The cap is the chart's alone: the stat cards still average and count over
    // all six habits.
    await expect(summaryValue(authedPage, 'Habits on streak')).toHaveText('1');
    await expect(summarySub(authedPage, 'Habits on streak')).toHaveText('of 6');

    // The streak is server-computed over full history, so it survives a range
    // narrower than itself. Reading it off the `rangeDays` tracker window would
    // clip it to 7 here.
    await expect(habitRows.nth(0).getByTitle(`${STREAK_DAYS}-day streak`)).toBeVisible();
    await authedPage.getByRole('tab', { name: '7 days' }).click();
    await expect(authedPage.getByText('Your last 7 days at a glance')).toBeVisible();
    await expect(habitRows.nth(0).getByTitle(`${STREAK_DAYS}-day streak`)).toBeVisible();
});
