import type { Locator, Page } from '@playwright/test';

import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Tracker toggling and the KPI/streak cache invalidation that has to follow it.
 *
 * Three copies of that invalidation exist today (the dashboard row, the Today
 * panel's `use-tracker-toggle`, and the detail view's `use-habit-detail-data`),
 * and they are about to be unified. The failure mode is invisible to a
 * naive test: a wrong React Query key prefix still shows the right number,
 * because `kpi-adapter` patches the cache optimistically — it only reverts on
 * the next real fetch. **So every number asserted here is re-asserted after a
 * reload**, which throws the cache away and re-reads the server.
 *
 * The seeded arithmetic (see `golden-profile.ts`), all mirrored by
 * `services/habit_stats.py`:
 *  - Daily habit: completions on days -1..-7 (day -4 SKIPPED, which still
 *    *continues* a streak), a gap at -8, then -9..-16. Today is empty, so the
 *    server's `current_streak` is 0 — a streak only counts if it ends today —
 *    while `longest_streak` is the older 8-day run. Total completions: 14.
 *  - Completing today joins the -7..-1 run: current streak 8.
 *  - Filling the -8 gap merges both runs into one 16-day streak.
 *  - Thrice-weekly (3 per 7 days) completed -6/-4/-2: today is AUTO-skipped
 *    (three completions already inside the window), so its streak *does* include
 *    today and reads 3.
 *  - Lapsed habit: one completion 45 days ago, so streak 0 and no streak rows.
 *
 * Determinism: the habit endpoints take a `tz` param and the client sends the
 * browser zone. `playwright.config.ts` pins that to UTC, which is the API
 * container's clock, so "today" is the same day on both sides. The last test
 * here asserts that premise rather than assuming it.
 */

const DAY_MS = 86_400_000;

/** The dashboard's empty-streak glyph (U+2013 EN DASH). */
const NO_STREAK = '–';

// A dashboard day cell's aria-label is status-INDEPENDENT (it names the next
// state, not the current one — and interpolates an object while doing it, see
// the note on `dayCell`). The rendered glyph is therefore the only handle on a
// cell's current status that doesn't require adding a test id to `src/`.
const COMPLETED_GLYPH = 'svg.lucide-check';
const NOT_COMPLETED_GLYPH = 'svg.lucide-square';
const SKIPPED_GLYPH = 'svg.lucide-chevrons-right';

/**
 * `M/D/YYYY` for `daysBack` before the anchor — exactly what the browser renders
 * via `toLocaleDateString()` under the pinned `en-US` locale and UTC zone.
 */
const usDate = (anchor: Date, daysBack: number): string => {
    const iso = new Date(anchor.getTime() - daysBack * DAY_MS).toISOString().slice(0, 10);
    const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
    return `${month}/${day}/${year}`;
};

/** Calendar month (0-based) for `daysBack` before the anchor, in UTC. */
const utcMonth = (anchor: Date, daysBack: number): number =>
    new Date(anchor.getTime() - daysBack * DAY_MS).getUTCMonth();

const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A habit's row on the /habits dashboard. */
const habitRow = (page: Page, name: string): Locator =>
    page.getByRole('row').filter({ has: page.getByRole('link', { name }) });

/** A row's server-computed current-streak cell (column 2, after the name). */
const streakCell = (row: Locator): Locator => row.getByRole('cell').nth(1);

/**
 * One day cell in a dashboard row. The `.*` in the middle is deliberate: the
 * label reads "Mark habit X as [object Object] for D" because it interpolates
 * `getNextTrackerState`'s update object, and this spec should not depend on
 * that stringification.
 */
const dayCell = (row: Locator, habitName: string, dateLabel: string): Locator =>
    row.getByRole('button', {
        name: new RegExp(`^Mark habit ${escapeRe(habitName)} as .* for ${escapeRe(dateLabel)}$`)
    });

/**
 * A habit row's name link. Not `exact`: the row `Label` appends the cadence, so
 * the accessible name reads "Daily habit daily".
 */
const habitRowLink = (page: Page, name: string): Locator => page.getByRole('link', { name });

/** The open habit detail pane (the only `<aside>` on this surface). */
const detailPane = (page: Page): Locator => page.getByRole('complementary');

// A KPI card is three stacked divs: label, value, sub. No roles to grab, so
// anchor on the (unique) label text and step sideways.
const kpiValue = (pane: Locator, label: string): Locator =>
    pane.getByText(label, { exact: true }).locator('xpath=following-sibling::div[1]');
const kpiSub = (pane: Locator, label: string): Locator =>
    pane.getByText(label, { exact: true }).locator('xpath=following-sibling::div[2]');

/** The "Recent streaks" panel — the innermost div wrapping that heading. */
const streakPanel = (pane: Locator, page: Page): Locator =>
    pane
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: 'Recent streaks' }) })
        .last();

/**
 * Open a habit's detail pane from the dashboard and wait for its KPI board.
 * Returns the pane locator.
 */
const openHabitPane = async (page: Page, habitName: string): Promise<Locator> => {
    await habitRowLink(page, habitName).click();
    const pane = detailPane(page);
    await expect(pane.getByRole('heading', { name: habitName, exact: true })).toBeVisible();
    // The skeleton renders six empty cards; the labels only exist once the KPI
    // response has landed, so this is the "board is real" gate.
    await expect(pane.getByText('Current', { exact: true })).toBeVisible();
    return pane;
};

test("toggling today's cell moves the streak, and the new figure survives a refetch", async ({
    authedPage,
    anchor
}) => {
    await gotoAppRoute(authedPage, '/habits');

    const row = habitRow(authedPage, GOLDEN.habits.daily);
    const streak = streakCell(row);
    const today = dayCell(row, GOLDEN.habits.daily, usDate(anchor, 0));

    // The thrice-weekly habit's streak is 3 only once its KPI request lands, so
    // this doubles as the gate that makes the daily habit's "0" below meaningful
    // rather than a still-loading default.
    await expect(streakCell(habitRow(authedPage, GOLDEN.habits.thrice))).toHaveText('3');

    await expect(today.locator(NOT_COMPLETED_GLYPH)).toBeVisible();
    await expect(streak).toHaveText(NO_STREAK);

    await today.click();

    // -7..-1 (with -4 skipped) + today = 8.
    await expect(today.locator(COMPLETED_GLYPH)).toBeVisible();
    await expect(streak).toHaveText('8');

    // THE POINT OF THIS SPEC. A wrong invalidation key leaves the optimistic 8
    // on screen and snaps back to the dash on the next real fetch.
    await authedPage.reload();
    await expect(streak).toHaveText('8');
    await expect(today.locator(COMPLETED_GLYPH)).toBeVisible();

    // Second click cycles completed -> skipped. A manual skip still CONTINUES a
    // streak, so the figure must hold at 8 rather than collapse.
    await today.click();
    await expect(today.locator(SKIPPED_GLYPH)).toBeVisible();
    await expect(streak).toHaveText('8');

    // Third click clears the day and returns the row to its seeded state.
    await today.click();
    await expect(today.locator(NOT_COMPLETED_GLYPH)).toBeVisible();
    await expect(streak).toHaveText(NO_STREAK);

    await authedPage.reload();
    await expect(streak).toHaveText(NO_STREAK);
    await expect(today.locator(NOT_COMPLETED_GLYPH)).toBeVisible();
});

test('backdating from the detail calendar merges two streaks, and the merge survives a refetch', async ({
    authedPage,
    anchor
}) => {
    await gotoAppRoute(authedPage, '/habits');
    const pane = await openHabitPane(authedPage, GOLDEN.habits.daily);

    // Seeded baseline.
    await expect(kpiValue(pane, 'Current')).toHaveText('0');
    await expect(kpiValue(pane, 'Longest')).toHaveText('8');
    await expect(kpiValue(pane, 'Total')).toHaveText('14');
    await expect(kpiSub(pane, 'Last done')).toHaveText('yesterday');

    // Two streaks, deliberately unequal: the 8-day run and the 7-day run.
    const streaks = streakPanel(pane, authedPage);
    await expect(streaks.getByText('8', { exact: true })).toBeVisible();
    await expect(streaks.getByText('7', { exact: true })).toBeVisible();

    // The gap day (-8) is the only thing keeping the two runs apart. It may sit
    // in the previous calendar month; the pager can only ever be one step away.
    if (utcMonth(anchor, 8) !== utcMonth(anchor, 0)) {
        await pane.getByRole('button', { name: 'Previous month' }).click();
    }
    const gapDay = pane.getByLabel(new RegExp(`^${escapeRe(usDate(anchor, 8))} .* not completed$`));
    await expect(gapDay).toBeVisible();
    await gapDay.click();

    // -16..-1 is now unbroken: one 16-day streak, 15 completions. "Current" is
    // still 0 because the run ends yesterday, not today.
    await expect(kpiValue(pane, 'Longest')).toHaveText('16');
    await expect(kpiValue(pane, 'Total')).toHaveText('15');
    await expect(kpiValue(pane, 'Current')).toHaveText('0');
    await expect(streaks.getByText('16', { exact: true })).toBeVisible();
    await expect(streaks.getByText('8', { exact: true })).toHaveCount(0);
    await expect(streaks.getByText('7', { exact: true })).toHaveCount(0);

    // Refetch from scratch: the optimistic `kpi-adapter` patch is gone, so these
    // numbers now come straight from `habit_stats.py`.
    await authedPage.reload();
    const reopened = await openHabitPane(authedPage, GOLDEN.habits.daily);
    await expect(kpiValue(reopened, 'Longest')).toHaveText('16');
    await expect(kpiValue(reopened, 'Total')).toHaveText('15');
    await expect(kpiValue(reopened, 'Current')).toHaveText('0');
    await expect(streakPanel(reopened, authedPage).getByText('16', { exact: true })).toBeVisible();
});

test('the lapsed habit reads as a zero streak with no streak rows', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/habits');

    const row = habitRow(authedPage, GOLDEN.habits.paused);
    await expect(streakCell(row)).toHaveText(NO_STREAK);

    const pane = await openHabitPane(authedPage, GOLDEN.habits.paused);
    await expect(kpiValue(pane, 'Current')).toHaveText('0');
    // Its one completion is a 1-day streak — enough for "longest", but the chart
    // drops streaks of length 1 as noise.
    await expect(kpiValue(pane, 'Longest')).toHaveText('1');
    await expect(kpiValue(pane, 'Total')).toHaveText('1');
    await expect(kpiSub(pane, 'Last done')).toHaveText('45d ago');
    await expect(pane.getByText('No streaks yet')).toBeVisible();
});

test('habit stat requests carry the pinned UTC zone', async ({ authedPage }) => {
    // Every number in this file depends on the browser and the API container
    // agreeing on "today", which they only do because the client forwards its
    // zone and the config pins that zone to the container's (UTC).
    const statUrls: string[] = [];
    authedPage.on('request', (request) => {
        const url = request.url();
        if (/\/habits\/\d+\/(kpis|streaks|trackers-lite)/.test(url)) statUrls.push(url);
    });

    await gotoAppRoute(authedPage, '/habits');
    await expect(streakCell(habitRow(authedPage, GOLDEN.habits.thrice))).toHaveText('3');

    expect(statUrls.length, 'no habit stat requests were observed').toBeGreaterThan(0);
    for (const url of statUrls) {
        expect(url, `${url} is missing tz=UTC`).toContain('tz=UTC');
    }
});
