import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The master-detail side panes: `TaskDetailPane`, `HabitDetailPane` and the
 * countdown form pane. Nothing else in the suite ever opens one, so the whole
 * shell — the sticky `<aside>`, the grid track that widens beside the list, the
 * id-keyed remount, and the narrow-screen fallback to a full-page route — is
 * unguarded. A shared `DetailPane`/`PageShell` extraction has to keep every
 * assertion here true.
 *
 * All three panes are the only `<aside>` elements in the app, so
 * `getByRole('complementary')` is an exact, testid-free handle on "the pane".
 *
 * Pane width is deliberately asserted as a number: the task/habit panes ride a
 * 480px grid track and the countdown form a 400px one, and `paneRowClass` only
 * emits those two literals for Tailwind to see.
 */

const TASK_PANE_WIDTH = 480;
const COUNTDOWN_PANE_WIDTH = 400;

/** The one open detail pane, whichever surface it belongs to. */
const detailPane = (page: Page): Locator => page.getByRole('complementary');

/** A task title in any list (Today bands, All tasks, project view). */
const taskTitle = (page: Page, title: string): Locator =>
    page.getByRole('button', { name: title, exact: true });

/**
 * A habit row's name link on the /habits dashboard. Deliberately not `exact`:
 * the row's `Label` appends the cadence, so the accessible name reads
 * "Daily habit daily". The three golden habit names share no prefix.
 */
const habitRowLink = (page: Page, name: string): Locator => page.getByRole('link', { name });

/**
 * Assert the pane has reached its full width, and return that width.
 *
 * Measured twice on purpose. The `<aside>` rides a grid track that animates
 * 0 -> 480/400px over 300ms, so it needs polling (with headroom beyond
 * `expect.poll`'s 5s default — the whole point of the animation is that the box
 * is wrong until it finishes). Its fixed-width INNER div, by contrast, is laid
 * out at the final width from the first frame, which is what keeps the content
 * from reflowing mid-open; that one is exact and needs no wait.
 */
const assertPaneWidth = async (page: Page, expected: number): Promise<number> => {
    const pane = detailPane(page);
    await expect
        .poll(async () => Math.round((await pane.boundingBox())!.width), {
            timeout: 10_000,
            intervals: [50, 100, 250, 500, 1000]
        })
        .toBe(expected);
    const contentWidth = Math.round((await pane.locator('> div').first().boundingBox())!.width);
    expect(contentWidth, 'pane content is laid out at its final width throughout').toBe(expected);
    return Math.round((await pane.boundingBox())!.width);
};

/** Alpha's project id, read from the API rather than clicked through. */
const alphaProjectId = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<number> => {
    const response = await api.get('/projects/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `GET /projects/ failed: ${response.status()}`).toBeTruthy();
    const projects: { id: number; name: string }[] = (await response.json()).projects;
    const alpha = projects.find((p) => p.name === GOLDEN.projects.alpha);
    expect(alpha, `${GOLDEN.projects.alpha} missing from the golden import`).toBeTruthy();
    return alpha!.id;
};

test('Today opens a task in a pane beside the list, and closing restores full width', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/');

    const listTitle = taskTitle(authedPage, GOLDEN.tasks.now);
    await expect(listTitle).toBeVisible();
    // Nothing selected on arrival.
    await expect(detailPane(authedPage)).toHaveCount(0);

    await listTitle.click();

    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();
    expect(await assertPaneWidth(authedPage, TASK_PANE_WIDTH)).toBe(TASK_PANE_WIDTH);

    // Master-DETAIL, not a replacement: the row that opened it is still on
    // screen, and entirely to the left of the pane.
    await expect(listTitle).toBeVisible();
    const listBox = (await listTitle.boundingBox())!;
    const paneBox = (await pane.boundingBox())!;
    expect(listBox.x + listBox.width).toBeLessThanOrEqual(paneBox.x + 1);

    // The card marks itself as the selected one.
    await expect(listTitle).toHaveAttribute('aria-pressed', 'true');

    await pane.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(detailPane(authedPage)).toHaveCount(0);
    await expect(listTitle).toBeVisible();
    await expect(listTitle).toHaveAttribute('aria-pressed', 'false');
});

test('selecting a different task remounts the pane with the new task', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    await taskTitle(authedPage, GOLDEN.tasks.now).click();
    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();
    // Grab the live element so a remount (the pane is keyed by task id) can be
    // proven rather than inferred from the swapped text.
    const firstAside = await pane.elementHandle();

    await taskTitle(authedPage, GOLDEN.tasks.soon).click();

    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.soon, exact: true })).toBeVisible();
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toHaveCount(0);
    expect(
        await firstAside!.evaluate((el) => el.isConnected),
        'the pane is keyed by task id, so switching tasks must replace the <aside>'
    ).toBe(false);
    // Still exactly one pane — the two never stack.
    await expect(detailPane(authedPage)).toHaveCount(1);
});

test("Today's habit rows open the habit pane, evicting the task pane", async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    await taskTitle(authedPage, GOLDEN.tasks.now).click();
    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();

    // The Today panel lists habits as links; on wide screens the click is
    // intercepted and opens the pane instead of navigating.
    const habitLink = authedPage.getByRole('link', { name: GOLDEN.habits.daily, exact: true });
    await expect(habitLink).toBeVisible();
    await habitLink.click();

    await expect(authedPage).not.toHaveURL(/\/details\//);
    await expect(
        pane.getByRole('heading', { name: GOLDEN.habits.daily, exact: true })
    ).toBeVisible();
    await expect(pane.getByRole('button', { name: 'Close habit' })).toBeVisible();
    // One pane slot, shared: the task detail is gone.
    await expect(detailPane(authedPage)).toHaveCount(1);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toHaveCount(0);

    // Wait for the habit body's own data before closing: the pane plays a
    // `pane-rise` transform on mount, and clicking a still-transforming element
    // fails Playwright's stability check.
    await expect(pane.getByText('Current', { exact: true })).toBeVisible();
    await pane.getByRole('button', { name: 'Close habit' }).click();
    await expect(detailPane(authedPage)).toHaveCount(0);
});

test('All tasks opens the same pane beside its list', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/tasks');

    const listTitle = taskTitle(authedPage, GOLDEN.tasks.now);
    await expect(listTitle).toBeVisible();
    await expect(detailPane(authedPage)).toHaveCount(0);

    await listTitle.click();

    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();
    expect(await assertPaneWidth(authedPage, TASK_PANE_WIDTH)).toBe(TASK_PANE_WIDTH);
    await expect(listTitle).toBeVisible();
    expect((await listTitle.boundingBox())!.x).toBeLessThan((await pane.boundingBox())!.x);

    await pane.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(detailPane(authedPage)).toHaveCount(0);
});

test('the project view opens the same pane beside its list', async ({
    api,
    account,
    authedPage,
    goldenProfileId
}) => {
    const projectId = await alphaProjectId(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, `/projects/${projectId}`);

    await expect(
        authedPage.getByRole('heading', { name: GOLDEN.projects.alpha, exact: true })
    ).toBeVisible();

    const listTitle = taskTitle(authedPage, GOLDEN.tasks.soon);
    await expect(listTitle).toBeVisible();
    await listTitle.click();

    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.soon, exact: true })).toBeVisible();
    expect(await assertPaneWidth(authedPage, TASK_PANE_WIDTH)).toBe(TASK_PANE_WIDTH);
    // The project header stays put — the pane never replaces the page.
    await expect(
        authedPage.getByRole('heading', { name: GOLDEN.projects.alpha, exact: true })
    ).toBeVisible();

    await pane.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(detailPane(authedPage)).toHaveCount(0);
});

test('the countdown form opens in a narrower pane and remounts when editing', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/countdown');
    await expect(authedPage.getByText(GOLDEN.countdowns.future, { exact: true })).toBeVisible();
    await expect(detailPane(authedPage)).toHaveCount(0);

    await authedPage.getByRole('button', { name: 'New countdown' }).click();

    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: 'New countdown' })).toBeVisible();
    // 400px, not the task/habit panes' 480px.
    expect(await assertPaneWidth(authedPage, COUNTDOWN_PANE_WIDTH)).toBe(COUNTDOWN_PANE_WIDTH);
    await expect(pane.getByLabel('Countdown title')).toHaveValue('');
    const createAside = await pane.elementHandle();

    // The seeded overdue countdown is the only member of the Overdue group (the
    // yearly one rolls forward), so its section scopes the Edit control.
    const overdueSection = authedPage
        .locator('section')
        .filter({ has: authedPage.getByRole('heading', { name: 'Overdue' }) });
    await overdueSection.getByRole('button', { name: 'Edit countdown' }).click();

    await expect(pane.getByRole('heading', { name: 'Edit countdown' })).toBeVisible();
    await expect(pane.getByLabel('Countdown title')).toHaveValue(GOLDEN.countdowns.overdue);
    expect(
        await createAside!.evaluate((el) => el.isConnected),
        'the countdown pane is keyed by countdown id, so switching targets must replace the <aside>'
    ).toBe(false);

    await pane.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(detailPane(authedPage)).toHaveCount(0);
});

test('the pane is a sticky aside with its own scroll container', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/habits');

    await habitRowLink(authedPage, GOLDEN.habits.daily).click();
    const pane = detailPane(authedPage);
    // The streak chart is the last block in the body — once it is there, the
    // pane is at its full height and worth measuring.
    await expect(pane.getByText('Recent streaks')).toBeVisible();

    const shell = await pane.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
            tag: el.tagName,
            position: style.position,
            overflowY: style.overflowY,
            overflows: el.scrollHeight > el.clientHeight
        };
    });
    expect(shell.tag).toBe('ASIDE');
    expect(shell.position).toBe('sticky');
    expect(shell.overflowY).toBe('auto');
    expect(shell.overflows, 'the habit detail is taller than the pane viewport').toBe(true);

    // Scrolling the pane must not move the page behind it.
    await authedPage.evaluate(() => window.scrollTo(0, 0));
    const paneScrollTop = await pane.evaluate((el) => {
        el.scrollTop = 200;
        return el.scrollTop;
    });
    expect(paneScrollTop).toBeGreaterThan(0);
    expect(await authedPage.evaluate(() => window.scrollY)).toBe(0);
});

/**
 * CURRENT BEHAVIOR, pinned deliberately — not an endorsement.
 *
 * `HabitDetailPane` honors its `isWide` prop (`if (habitId == null || !isWide)
 * return null`). `TaskDetailPane` declares the same prop but its destructure
 * omits it, so it renders whenever `taskId != null` and relies entirely on its
 * callers gating. Every caller does gate the *selection* (`useTaskDetailPane`
 * navigates instead of selecting below lg), so a fresh narrow load is fine —
 * but a viewport that narrows while a task is selected leaves the 480px pane
 * mounted in normal block flow, while the habit pane in the same slot vanishes.
 *
 * Asserted rather than `test.fail`ed because it is a divergence to fix in the
 * upcoming shared-DetailPane extraction, not a broken user flow today.
 */
test('the task pane survives a narrowing viewport where the habit pane does not', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/');

    // --- task pane: still mounted after narrowing (the divergence) ---
    await taskTitle(authedPage, GOLDEN.tasks.now).click();
    const pane = detailPane(authedPage);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();

    await authedPage.setViewportSize({ width: 390, height: 844 });
    await expect(detailPane(authedPage)).toHaveCount(1);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();

    await pane.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(detailPane(authedPage)).toHaveCount(0);

    // --- habit pane: unmounts on the same narrowing ---
    await authedPage.setViewportSize({ width: 1280, height: 720 });
    const habitLink = authedPage.getByRole('link', { name: GOLDEN.habits.daily, exact: true });
    await expect(habitLink).toBeVisible();
    await habitLink.click();
    await expect(
        detailPane(authedPage).getByRole('heading', { name: GOLDEN.habits.daily, exact: true })
    ).toBeVisible();

    await authedPage.setViewportSize({ width: 390, height: 844 });
    await expect(detailPane(authedPage)).toHaveCount(0);
});

test('@narrow a task title navigates to the full-page task route instead of a pane', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/');

    await taskTitle(authedPage, GOLDEN.tasks.now).click();

    await expect(authedPage).toHaveURL(/\/tasks\/\d+$/);
    await expect(detailPane(authedPage)).toHaveCount(0);
    await expect(
        authedPage.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })
    ).toBeVisible();
    // Origin-aware back link, since there is no pane to close.
    await expect(authedPage.getByRole('link', { name: '‹ Today' })).toBeVisible();
});

test('@narrow All tasks navigates to the full-page task route instead of a pane', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/tasks');

    const listTitle = taskTitle(authedPage, GOLDEN.tasks.now);
    await expect(listTitle).toBeVisible();
    await listTitle.click();

    await expect(authedPage).toHaveURL(/\/tasks\/\d+$/);
    await expect(detailPane(authedPage)).toHaveCount(0);
});

test('@narrow a habit row navigates to the full-page habit route instead of a pane', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/habits');

    await habitRowLink(authedPage, GOLDEN.habits.daily).click();

    await expect(authedPage).toHaveURL(/\/details\/\d+$/);
    await expect(detailPane(authedPage)).toHaveCount(0);
    await expect(
        authedPage.getByRole('heading', { name: GOLDEN.habits.daily, exact: true })
    ).toBeVisible();
    await expect(authedPage.getByRole('link', { name: '‹ Habits' })).toBeVisible();
});

test('@narrow the countdown form opens as a modal instead of a pane', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/countdown');
    await expect(authedPage.getByText(GOLDEN.countdowns.future, { exact: true })).toBeVisible();

    await authedPage.getByRole('button', { name: 'New countdown' }).click();

    // `toBeAttached`, not `toBeVisible`: the element carrying role=dialog is the
    // Headless UI `Dialog` root, which is `position: relative` with only `fixed`
    // children — so it has an empty box even while the panel is on screen.
    const dialog = authedPage.getByRole('dialog');
    await expect(dialog).toBeAttached();
    await expect(dialog.getByRole('heading', { name: 'New countdown' })).toBeVisible();
    await expect(detailPane(authedPage)).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(authedPage.getByRole('dialog')).toHaveCount(0);
});
