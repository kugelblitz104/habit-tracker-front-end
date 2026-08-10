import type { APIRequestContext } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { stampFrom } from '../fixtures/clock';
import { expect, gotoAppRoute, signIn, test } from '../fixtures/test';
import { TaskStatus } from '@/types/types';

/**
 * Paging for the "Closed" disclosure.
 *
 * The section fetches its own list (`band=hidden`, `include_closed=true`) and
 * used to walk every page of it on mount, on all three surfaces that mount the
 * section, for a disclosure that is collapsed by default and shows only a
 * count. It now fetches one page and offers "Load more".
 *
 * `GET /tasks/` orders this particular query by `closed_date DESC`
 * (routers/tasks.py), so page one is the most recently closed 100 and the tail
 * is genuinely unreachable without paging. That ordering is what the spec
 * leans on: CLOSED 101-105 are the oldest, so they cannot appear until the
 * second page is fetched.
 *
 * Seeded through `POST /backup/profiles` rather than 105 serial `POST /tasks/`
 * calls: a whole profile in one request, and `closed_date` can be set
 * directly instead of having to create-then-update each task to close it.
 */

const CLOSED_COUNT = 105;
const PAGE_SIZE = 100;

/** `CLOSED 001` is the most recently closed, `CLOSED 105` the oldest. */
const closedTitle = (n: number) => `CLOSED ${String(n).padStart(3, '0')}`;

const PROFILE_NAME = 'E2E Closed Paging';

/**
 * Import a profile whose only content is `CLOSED_COUNT` closed tasks, each
 * closed a day further back than the last.
 */
const seedClosedProfile = async (
    api: APIRequestContext,
    account: Account,
    anchor: Date
): Promise<number> => {
    const document = {
        format: 'habit-tracker-profile-backup',
        version: 1,
        exported_at: stampFrom(anchor, 0, '12:00:00'),
        // Every field pinned: `ProfileBackup` requires them all, and the other
        // surfaces are switched off so Today renders tasks and nothing else.
        profile: {
            name: PROFILE_NAME,
            color_start: '#3366cc',
            color_end: '#cc3366',
            habits_enabled: false,
            countdowns_enabled: false,
            insights_enabled: false,
            calendar_enabled: false,
            publish_to_azure: false,
            default_landing: 'today',
            week_start_monday: true,
            use_habit_color_accent: false,
            show_estimated_effort: false,
            pomodoro_work_minutes: 25,
            pomodoro_break_minutes: 5,
            pomodoro_long_break_minutes: 15,
            pomodoro_cycles: 4
        },
        projects: [],
        tasks: Array.from({ length: CLOSED_COUNT }, (_, index) => {
            const n = index + 1;
            return {
                id: 1000 + n,
                title: closedTitle(n),
                status: TaskStatus.DONE,
                priority: 0,
                closed_date: stampFrom(anchor, -n, '09:00:00'),
                created_date: stampFrom(anchor, -n - 1, '09:00:00'),
                sort_order: n
            };
        }),
        countdowns: [],
        time_entries: [],
        habits: [],
        trackers: [],
        calendar_connections: [],
        integration_connections: []
    };

    const response = await api.post('/backup/profiles', {
        headers: authHeaders(account),
        data: document
    });
    expect(
        response.ok(),
        `closed-profile import failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    const summary = await response.json();
    expect(summary.warnings, `import warnings: ${summary.warnings.join('; ')}`).toEqual([]);
    expect(summary.tasks_imported).toBe(CLOSED_COUNT);
    return summary.profile_id as number;
};

test('the Closed section loads one page, then pages the rest in on demand', async ({
    api,
    account,
    anchor,
    page
}) => {
    const profileId = await seedClosedProfile(api, account, anchor);
    await signIn(page, account, anchor, profileId);
    await gotoAppRoute(page, '/');

    // Collapsed header: one page held, more available, so the count carries `+`
    // rather than claiming a total it has not fetched.
    const disclosure = page.getByRole('button', { name: /^Closed/ });
    await expect(disclosure).toHaveText(`Closed${PAGE_SIZE}+`);

    await disclosure.click();

    // Page one is the 100 most recently closed.
    await expect(page.getByRole('button', { name: closedTitle(1), exact: true })).toBeVisible();
    await expect(
        page.getByRole('button', { name: closedTitle(PAGE_SIZE), exact: true })
    ).toBeVisible();

    // The tail is genuinely absent until asked for.
    await expect(
        page.getByRole('button', { name: closedTitle(CLOSED_COUNT), exact: true })
    ).toBeHidden();

    await page.getByRole('button', { name: /load more/i }).click();

    // Everything is held now, so the count is exact and the `+` is gone.
    await expect(
        page.getByRole('button', { name: closedTitle(CLOSED_COUNT), exact: true })
    ).toBeVisible();
    await expect(disclosure).toHaveText(`Closed${CLOSED_COUNT}`);
    await expect(page.getByRole('button', { name: /load more/i })).toBeHidden();
});
