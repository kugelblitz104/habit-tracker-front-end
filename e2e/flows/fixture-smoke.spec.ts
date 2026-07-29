import { importGoldenProfile } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Validates the fixture itself: that the golden dataset imports, that token
 * injection signs the browser in, and that the app lands on the imported profile
 * rather than the empty "Personal" one.
 *
 * Everything else in the suite assumes all three, so this is the spec to look at
 * first when the whole run goes red.
 */

test('the golden import creates every entity type', async ({ api, account, anchor }) => {
    // Imports a second copy deliberately: this asserts the document's own shape,
    // independently of the `goldenProfileId` fixture the other tests rely on.
    const summary = await importGoldenProfile(api, account, anchor);

    expect(summary.success).toBe(true);
    expect(summary.projects_imported).toBe(2);
    // Top-level tasks and subtasks are counted separately.
    expect(summary.tasks_imported).toBe(9);
    expect(summary.subtasks_imported).toBe(2);
    expect(summary.countdowns_imported).toBe(4);
    expect(summary.time_entries_imported).toBe(3);
    expect(summary.habits_imported).toBe(3);
    expect(summary.trackers_imported).toBe(19);
});

test('signs in without touching the login form and selects the golden profile', async ({
    authedPage,
    goldenProfileId
}) => {
    await gotoAppRoute(authedPage, '/');

    // Never bounced to /login.
    await expect(authedPage).not.toHaveURL(/\/login/);

    const stored = await authedPage.evaluate(() => ({
        activeProfile: localStorage.getItem('active_profile'),
        hasUser: !!localStorage.getItem('user'),
        hasToken: !!localStorage.getItem('access_token')
    }));
    expect(stored.hasToken).toBe(true);
    expect(stored.hasUser).toBe(true);
    expect(stored.activeProfile).toBe(String(goldenProfileId));
});

test('renders the seeded task data on Today', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    // Priority-driven bands, so these placements hold regardless of the date.
    await expect(authedPage.getByText(GOLDEN.tasks.now, { exact: true })).toBeVisible();
    await expect(authedPage.getByText(GOLDEN.tasks.soon, { exact: true })).toBeVisible();
    await expect(authedPage.getByText(GOLDEN.tasks.whenever, { exact: true })).toBeVisible();

    // Closed tasks are behind the Closed disclosure, never inline.
    await expect(authedPage.getByText(GOLDEN.tasks.closed, { exact: true })).toHaveCount(0);
});

test('holds the clock still', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');
    // Settle first: React Router performs same-document navigations while
    // hydrating, and evaluating mid-flight tears down the execution context.
    // Seeded content on screen means hydration and the first fetch are done.
    await expect(authedPage.getByText(GOLDEN.tasks.now, { exact: true })).toBeVisible();

    const first = await authedPage.evaluate(() => Date.now());
    await authedPage.waitForTimeout(1500);
    const second = await authedPage.evaluate(() => Date.now());
    // setFixedTime pins Date while leaving timers running, so this must not move.
    // If it does, `useNow`'s 60s tick can mutate the UI mid-assertion.
    expect(second).toBe(first);
});
