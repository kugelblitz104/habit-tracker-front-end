import { expect, test, gotoAppRoute, signIn } from '../fixtures/test';
import { stampFrom } from '../fixtures/clock';
import type { APIRequestContext } from '@playwright/test';
import type { Account } from '../fixtures/api';

/**
 * The reconciliation ritual.
 *
 * **Why this seeds its own profile rather than using the golden one.** Every
 * queue here is measured from `created_date` / `updated_date`, and those are
 * server-stamped: they are absent from `TaskCreate` and `TaskUpdate`, so a
 * backdated row simply cannot be made through the ordinary API. The *only*
 * write path that carries them is `TaskBackup`, i.e. `POST /backup/profiles` -
 * which is what `importGoldenProfile` already uses. The golden profile's own
 * rows all sit near the anchor, so its queues are empty and it cannot exercise
 * this page; and extending it would move counts `settings-data.spec.ts`
 * asserts exactly. Same conclusion `countdown-archive.spec.ts` reached.
 */

const PROFILE_NAME = 'Reconciliation fixture';

/** Days back from the anchor, chosen against the 60-day default stale window. */
const STALE_DAYS = 94;
const FRESH_DAYS = 3;

const buildProfile = (anchor: Date) => {
    const stamp = (days: number) => stampFrom(anchor, days);
    return {
        format: 'habit-tracker-profile-backup',
        version: 1,
        exported_at: stamp(0),
        profile: {
            name: PROFILE_NAME,
            color_start: '#e0763f',
            color_end: '#c14e6a',
            habits_enabled: true,
            countdowns_enabled: true,
            insights_enabled: true,
            calendar_enabled: true,
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
        projects: [
            {
                id: 1,
                name: 'Abandoned rewrite',
                color: '#3366cc',
                created_date: stamp(-400),
                updated_date: stamp(-400)
            }
        ],
        tasks: [
            {
                id: 10,
                title: 'Stale printer task',
                priority: 1,
                status: 0,
                created_date: stamp(-200),
                updated_date: stamp(-STALE_DAYS)
            },
            {
                // Deferred is deliberately IN this queue: "not now", never
                // revisited, is the graveyard the page exists to clear.
                id: 11,
                title: 'Stale deferred task',
                priority: 0,
                status: 5,
                created_date: stamp(-300),
                updated_date: stamp(-300)
            },
            {
                id: 12,
                title: 'Recently touched task',
                priority: 0,
                status: 0,
                created_date: stamp(-200),
                updated_date: stamp(-FRESH_DAYS)
            },
            {
                id: 13,
                title: 'Closed parent task',
                priority: 0,
                status: 6,
                closed_date: stamp(-40),
                created_date: stamp(-100),
                updated_date: stamp(-40)
            },
            {
                id: 14,
                parent_id: 13,
                title: 'Orphaned subtask',
                priority: 0,
                status: 0,
                created_date: stamp(-100),
                updated_date: stamp(-90)
            }
        ]
    };
};

const importFixture = async (
    api: APIRequestContext,
    account: Account,
    anchor: Date
): Promise<number> => {
    const response = await api.post('/backup/profiles', {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        data: buildProfile(anchor)
    });
    expect(
        response.ok(),
        `fixture import failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    const summary = await response.json();
    expect(summary.warnings, `import warnings: ${summary.warnings.join('; ')}`).toEqual([]);
    return summary.profile_id;
};

test.describe('the reconciliation', () => {
    test('counts each queue, and excludes a recently touched task', async ({
        page,
        api,
        account,
        anchor
    }) => {
        const profileId = await importFixture(api, account, anchor);
        await signIn(page, account, anchor, profileId);
        await gotoAppRoute(page, '/reconciliation');

        const staleRow = page.getByRole('listitem').filter({ hasText: 'Stale tasks' });
        await expect(staleRow).toContainText('2');
        await expect(
            page.getByRole('listitem').filter({ hasText: 'Quiet projects' })
        ).toContainText('1');
        await expect(
            page.getByRole('listitem').filter({ hasText: 'Orphaned subtasks' })
        ).toContainText('1');
    });

    test('Keep is a real write that moves the row out of its queue', async ({
        page,
        api,
        account,
        anchor
    }) => {
        const profileId = await importFixture(api, account, anchor);
        await signIn(page, account, anchor, profileId);
        await gotoAppRoute(page, '/reconciliation');

        await page.getByRole('button', { name: 'Begin' }).click();
        await expect(page.getByText('Step 1 of 4')).toBeVisible();

        // Both stale rows are here; the recently-touched one is not.
        await expect(page.getByText('Stale printer task')).toBeVisible();
        await expect(page.getByText('Stale deferred task')).toBeVisible();
        await expect(page.getByText('Recently touched task')).toHaveCount(0);
        await expect(page.getByText(`untouched ${STALE_DAYS} days`)).toBeVisible();

        await page.getByRole('checkbox', { name: 'Select Stale printer task' }).click();
        await page.getByRole('button', { name: 'Keep', exact: true }).click();

        // The row leaves because the empty PATCH bumped updated_date - nothing
        // client-side hides it, so this is the whole Keep mechanism.
        await expect(page.getByText('Stale printer task')).toHaveCount(0);
        await expect(page.getByText('Stale deferred task')).toBeVisible();

        // And it is still open: Keep is not a close.
        const tasks = await api.get(`/tasks/?profile_id=${profileId}&limit=100`, {
            headers: { Authorization: `Bearer ${account.accessToken}` }
        });
        const kept = (await tasks.json()).tasks.find(
            (task: { title: string }) => task.title === 'Stale printer task'
        );
        expect(kept.status).toBe(0);
        expect(kept.closed_date).toBeNull();
    });

    test('reaches the summary and reports what changed', async ({ page, api, account, anchor }) => {
        const profileId = await importFixture(api, account, anchor);
        await signIn(page, account, anchor, profileId);
        await gotoAppRoute(page, '/reconciliation');

        await page.getByRole('button', { name: 'Begin' }).click();
        await page.getByRole('checkbox', { name: 'Select Stale deferred task' }).click();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();

        for (const label of ['Next', 'Next', 'Next', 'Finish']) {
            await page.getByRole('button', { name: label, exact: true }).click();
        }

        await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
        await expect(page.getByText('Tasks cancelled')).toBeVisible();
    });

    test('@touch the row checkbox meets the 24px AA floor', async ({
        page,
        api,
        account,
        anchor
    }) => {
        // target-size.spec.ts sweeps /reconciliation but never presses Begin, so
        // no queue row - and no checkbox - ever renders for it. Same blind spot
        // capture-bar-targets.spec.ts exists to cover for the token pills.
        const profileId = await importFixture(api, account, anchor);
        await signIn(page, account, anchor, profileId);
        await gotoAppRoute(page, '/reconciliation');
        await page.getByRole('button', { name: 'Begin' }).click();

        const box = await page
            .getByRole('checkbox', { name: 'Select Stale printer task' })
            .boundingBox();
        expect(box).not.toBeNull();
        // 24px flat on every pointer, with no coarse bump: rows sit ~40px apart,
        // so 44px targets would overlap the row above (data-target-exempt='inline').
        expect(box!.width).toBeGreaterThanOrEqual(24);
        expect(box!.height).toBeGreaterThanOrEqual(24);
    });

    test('Today offers the card, and stops once the ritual has run', async ({
        page,
        api,
        account,
        anchor
    }) => {
        const profileId = await importFixture(api, account, anchor);
        await signIn(page, account, anchor, profileId);
        await gotoAppRoute(page, '/');

        const card = page.getByText('4 things to decide');
        await expect(card).toBeVisible();

        await page.getByRole('link', { name: 'Reconcile' }).click();
        await page.getByRole('button', { name: 'Begin' }).click();

        await gotoAppRoute(page, '/');
        // writeLastRun fired on Begin, so the card stands down for 30 days.
        await expect(page.getByText('things to decide')).toHaveCount(0);
    });
});
