import type { Page, Route } from '@playwright/test';

import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * Loading / error / empty line locks for the nine hand-rolled query-state
 * branches scattered across the app.
 *
 * A shared `QueryState` component is about to replace them, so this spec pins
 * what each surface renders TODAY — both the copy (it differs per surface:
 * "Failed to load tasks." vs "Failed to load countdowns.", "Loading…" vs
 * "Loading tasks…") and the size tier, of which there are two:
 *
 *   - 12px on page-level surfaces (Today, All tasks, Countdown, Projects)
 *   - 11px on inline sections (the task editor's Subtasks list, the settings
 *     connection lists)
 *
 * The class string is asserted, not just the text, because the tier IS the thing
 * a careless extraction would flatten.
 *
 * A failure here means the copy or the tier moved. Confirm that was intended,
 * then update the literal in the same commit.
 */

const PAGE_ERROR = 'font-mono text-[12px] text-danger';
const PAGE_QUIET = 'font-mono text-[12px] text-text-faint';
const INLINE_ERROR = 'font-mono text-[11px] text-danger';
const INLINE_QUIET = 'font-mono text-[11px] text-text-faint';

/** Fail every request whose URL matches, with a 500 (NOT a 401 — that would
 *  send the axios interceptor down the token-refresh path and redirect). */
const failWith500 = (page: Page, pattern: string, when: (url: string) => boolean = () => true) =>
    page.route(pattern, (route: Route) =>
        when(route.request().url())
            ? route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: '{"detail":"e2e induced failure"}'
              })
            : route.fallback()
    );

/**
 * Hold a matching request open long enough for the loading branch to be read,
 * then fail it so the error branch follows in the same test.
 *
 * Kept short deliberately: the loading line renders on the query's first commit,
 * so a couple of seconds is plenty, and anything longer starts eating into the
 * 15s `expect.timeout` that the error assertion afterwards has to fit inside.
 */
const STALL_MS = 2500;
const stall = (page: Page, pattern: string, when: (url: string) => boolean = () => true) =>
    page.route(pattern, async (route: Route) => {
        if (!when(route.request().url())) return route.fallback();
        await new Promise((resolve) => setTimeout(resolve, STALL_MS));
        await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"detail":"e2e stalled request"}'
        });
    });

/**
 * The `include_closed=true` tasks list WITHOUT a band filter — the query key the
 * task editor's SubtaskSection shares with `TaskDetailBody`. Today's own list is
 * `include_closed=false` and its "done today" tally is
 * `include_closed=true&band=hidden`, so matching on this shape lets the subtasks
 * request fail while the page around it loads normally.
 */
const isSubtasksRequest = (url: string) =>
    url.includes('include_closed=true') && !url.includes('band=');

test('Today reports a failed tasks load', async ({ authedPage }) => {
    await failWith500(authedPage, '**/tasks/?*');
    await gotoAppRoute(authedPage, '/');

    const line = authedPage.getByText('Failed to load tasks.', { exact: true });
    await expect(line).toBeVisible();
    // Today's line carries an extra `mb-6` the others don't — it sits between the
    // capture bar and the first band, not at the end of a section.
    await expect(line).toHaveClass(`mb-6 ${PAGE_ERROR}`);
});

test('Today has NO loading branch while its tasks are in flight', async ({ authedPage }) => {
    await stall(authedPage, '**/tasks/?*');
    await gotoAppRoute(authedPage, '/');

    // The header renders from the (empty) task list rather than a placeholder, so
    // this asserts the surface reaches its normal shell with no loading line at
    // all. If the QueryState extraction adds one here that is a real UX change —
    // intended or not, it must be a deliberate edit to this expectation.
    await expect(authedPage.getByText('0 open', { exact: true })).toBeVisible();
    await expect(authedPage.getByText('Loading tasks…', { exact: true })).toHaveCount(0);
    await expect(authedPage.getByText('Loading…', { exact: true })).toHaveCount(0);
});

test('All tasks reports both its loading and error states', async ({ authedPage }) => {
    await stall(authedPage, '**/tasks/?*');
    await gotoAppRoute(authedPage, '/tasks');

    const loading = authedPage.getByText('Loading tasks…', { exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveClass(PAGE_QUIET);

    // The same stalled route resolves 500, so the error line replaces the
    // loading line in place — which also pins that they are mutually exclusive.
    const error = authedPage.getByText('Failed to load tasks.', { exact: true });
    await expect(error).toBeVisible();
    await expect(error).toHaveClass(PAGE_ERROR);
    await expect(loading).toHaveCount(0);
});

test('Projects reports both its loading and error states', async ({ authedPage }) => {
    await stall(authedPage, '**/projects/?*');
    await gotoAppRoute(authedPage, '/projects');

    const loading = authedPage.getByText('Loading projects…', { exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveClass(PAGE_QUIET);

    const error = authedPage.getByText('Failed to load projects.', { exact: true });
    await expect(error).toBeVisible();
    await expect(error).toHaveClass(PAGE_ERROR);
});

test('a project page reuses the All tasks copy but Today’s spacing', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    const projects = await api.get('/projects/', {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        params: { profile_id: goldenProfileId }
    });
    expect(projects.ok(), `list projects: ${projects.status()}`).toBeTruthy();
    const projectId = (await projects.json()).projects[0].id;

    await stall(authedPage, '**/tasks/?*');
    await gotoAppRoute(authedPage, `/projects/${projectId}`);

    // Same strings as /tasks...
    const loading = authedPage.getByText('Loading tasks…', { exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveClass(PAGE_QUIET);

    const error = authedPage.getByText('Failed to load tasks.', { exact: true });
    await expect(error).toBeVisible();
    // ...but this surface's error line carries Today's `mb-6` rather than /tasks'
    // bare line. Two of the nine sites share copy while differing in spacing —
    // precisely the kind of accidental variation a shared component must be told
    // about rather than silently pick a winner for.
    await expect(error).toHaveClass(`mb-6 ${PAGE_ERROR}`);
    // Unlike /tasks, this surface tests `isError` and `isLoading` independently
    // (the error line sits above the controls bar, the loading line below it), so
    // pin that they still don't overlap — a shared component that rendered both
    // would show two lines here.
    await expect(loading).toHaveCount(0);
});

test('the task detail pane collapses loading and error into ONE line', async ({ authedPage }) => {
    // The single-task GET (`/tasks/123`), not the list — a glob would catch both.
    await authedPage.route(
        (url) => /^\/tasks\/\d+$/.test(url.pathname),
        (route) =>
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: '{"detail":"e2e induced failure"}'
            })
    );
    await gotoAppRoute(authedPage, '/');
    await taskRowTitle(authedPage, GOLDEN.tasks.now).click();

    // The odd one out of the nine: a single node whose TEXT switches between the
    // two states, so there is no separate loading element to assert. Its padding
    // is baked in too, because the pane drops its card chrome around it.
    const line = authedPage.getByText('Failed to load task.', { exact: true });
    await expect(line).toBeVisible();
    // Note it keeps the QUIET tone (`text-text-faint`) even for the failure —
    // every other error site in the app uses `text-danger`.
    await expect(line).toHaveClass(`p-4 ${PAGE_QUIET}`);
    // No trailing "s" — this is the single-task message, not the list one.
    await expect(authedPage.getByText('Failed to load tasks.', { exact: true })).toHaveCount(0);
});

test('Countdown reports both its loading and error states', async ({ authedPage }) => {
    await stall(authedPage, '**/countdowns/?*');
    await gotoAppRoute(authedPage, '/countdown');

    // Countdown's quiet line is the bare "Loading…", not "Loading countdowns…".
    const loading = authedPage.getByText('Loading…', { exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveClass(PAGE_QUIET);

    const error = authedPage.getByText('Failed to load countdowns.', { exact: true });
    await expect(error).toBeVisible();
    await expect(error).toHaveClass(PAGE_ERROR);
});

test('Countdown has a THIRD, empty branch that is not part of the loading/error pair', async ({
    authedPage
}) => {
    // Served rather than deleted: the golden profile has four countdowns, and the
    // point is the zero-rows branch, not a delete flow.
    await authedPage.route('**/countdowns/?*', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ countdowns: [], total: 0, limit: 100, offset: 0 })
        })
    );
    await gotoAppRoute(authedPage, '/countdown');

    const empty = authedPage.getByText(
        'No countdowns yet. Add one to track a deadline — with or without a task.',
        { exact: true }
    );
    await expect(empty).toBeVisible();
    // Same quiet tier as the loading line, but a distinct branch: it must survive
    // the QueryState extraction as its own case, not get folded into "loading".
    await expect(empty).toHaveClass(PAGE_QUIET);
    await expect(authedPage.getByText('Loading…', { exact: true })).toHaveCount(0);
    await expect(authedPage.getByText('Failed to load countdowns.', { exact: true })).toHaveCount(
        0
    );
    // The header still reports the real (zero) count, so this is the empty state
    // rather than a half-rendered list.
    await expect(authedPage.getByText('0 countdowns', { exact: true })).toBeVisible();
});

/**
 * Open a task's detail pane on Today straight into edit mode, where the Subtasks
 * section is the inline (11px) query-state surface.
 *
 * Via the card's `e` shortcut rather than pane-then-pencil: the pane plays a
 * `pane-rise` transform on mount, so a click aimed at the header pencil races
 * the animation ("element is not stable") and then the editor swap detaches it.
 * The keyboard path opens the pane already editing, so nothing inside it is
 * clicked while it moves.
 */
const openSubtaskEditor = async (page: Page) => {
    await gotoAppRoute(page, '/');
    const title = taskRowTitle(page, GOLDEN.tasks.parent);
    await title.focus();
    await title.press('e');
    await expect(page.getByRole('heading', { name: 'Edit task' })).toBeVisible();
};

test('the editor Subtasks section reports its loading state at the inline tier', async ({
    authedPage
}) => {
    await stall(authedPage, '**/tasks/?*', isSubtasksRequest);
    await openSubtaskEditor(authedPage);

    const loading = authedPage.getByText('Loading subtasks…', { exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveClass(INLINE_QUIET);
});

test('the editor Subtasks section reports its error state at the inline tier', async ({
    authedPage
}) => {
    await failWith500(authedPage, '**/tasks/?*', isSubtasksRequest);
    await openSubtaskEditor(authedPage);

    const error = authedPage.getByText('Failed to load subtasks.', { exact: true });
    await expect(error).toBeVisible();
    await expect(error).toHaveClass(INLINE_ERROR);
    // The page around it is unaffected — only the subtasks query failed, so this
    // really is the inline branch and not the page-level one.
    await expect(authedPage.getByText('Failed to load tasks.', { exact: true })).toHaveCount(0);
});

test('the settings connection lists report their errors at the inline tier', async ({
    authedPage
}) => {
    await failWith500(authedPage, '**/calendar-connections/?*');
    await failWith500(authedPage, '**/integrations/?*');
    await gotoAppRoute(authedPage, '/settings');

    // Note: no trailing full stop on either of these, unlike every page-level
    // message. That inconsistency is exactly what a shared component would erase.
    const calendars = authedPage.getByText('Failed to load calendars', { exact: true });
    await expect(calendars).toBeVisible();
    await expect(calendars).toHaveClass(`py-1 ${INLINE_ERROR}`);

    const integrations = authedPage.getByText('Failed to load connections', { exact: true });
    await expect(integrations).toBeVisible();
    await expect(integrations).toHaveClass(`py-1 ${INLINE_ERROR}`);
});
