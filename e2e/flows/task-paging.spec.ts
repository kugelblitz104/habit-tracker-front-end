import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * What happens once a profile outgrows one page of `GET /tasks/`.
 *
 * The reported bug: with 115 tasks in a profile, a task card showed "0/2"
 * subtasks while its detail pane listed none. Every list endpoint caps `limit`
 * at 100, nothing in the UI paged, and each subtask surface filtered the
 * profile's list client-side — so rows past the cap simply weren't there.
 * Subtasks were the first to go, being priority 0 with no due date and
 * therefore last in the default ordering, while the card's counts come from a
 * server-side aggregate over the whole profile and stayed correct. The gap
 * between those two numbers is what a user sees.
 *
 * Two fixes have to hold for this to pass, and the spec pins both:
 *   - `getTasks` walks every page, so top-level cards survive past 100 tasks
 *   - the subtask surfaces fetch `?parent_id=`, so they never depend on where
 *     their rows happened to sort
 *
 * The golden profile is only 11 rows, so this spec seeds its own filler. The
 * filler is priority 3 (band "now") to guarantee it sorts ahead of the golden
 * subtasks — `priority DESC, due_date ASC NULLS LAST, created_date ASC` — which
 * is what puts them past the cap. `assertSubtasksPastPageOne` then verifies that
 * actually happened, so a future page-size change turns this into a failure
 * rather than a test that quietly stops testing anything.
 */

const FILLER_PREFIX = 'PAGEFILL';
const FILLER_COUNT = 100;
/** The API's per-request cap (`limit` is `ge=1, le=100`). */
const PAGE_SIZE = 100;

/**
 * Create `FILLER_COUNT` band-"now" tasks.
 *
 * Sequential on purpose: batching these 25-at-a-time cut the seed to about a
 * second but drew intermittent `ECONNRESET`s from the local single-process
 * uvicorn, which would read as a flaky spec rather than as the seed being too
 * aggressive. 100 serial POSTs against localhost cost a few seconds.
 */
const seedFiller = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<void> => {
    for (let i = 1; i <= FILLER_COUNT; i += 1) {
        const title = `${FILLER_PREFIX} ${i}`;
        const response = await api.post('/tasks/', {
            headers: authHeaders(account),
            data: { profile_id: profileId, title, priority: 3 }
        });
        expect(
            response.ok(),
            `filler "${title}" failed: ${response.status()} ${await response.text()}`
        ).toBeTruthy();
    }
};

/**
 * Confirm the profile really is over one page and that both golden subtasks fall
 * off it — the precondition the whole spec rests on.
 */
const assertSubtasksPastPageOne = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<void> => {
    const response = await api.get('/tasks/', {
        headers: authHeaders(account),
        params: { profile_id: profileId, include_closed: true, limit: PAGE_SIZE }
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body.total, 'seed did not push the profile past one page').toBeGreaterThan(PAGE_SIZE);
    expect(body.tasks).toHaveLength(PAGE_SIZE);
    const titles: string[] = body.tasks.map((task: { title: string }) => task.title);
    expect(
        titles,
        'open subtask still on page one — seed no longer reproduces the bug'
    ).not.toContain(GOLDEN.tasks.subtaskOpen);
    expect(titles).not.toContain(GOLDEN.tasks.subtaskDone);
};

/** A task title in a list or pane. */
const taskTitle = (scope: Page | Locator, title: string): Locator =>
    scope.getByRole('button', { name: title, exact: true });

test.beforeEach(async ({ api, account, goldenProfileId }) => {
    await seedFiller(api, account, goldenProfileId);
    await assertSubtasksPastPageOne(api, account, goldenProfileId);
});

test('the detail pane lists subtasks that sort past the first page', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    // The parent is priority 2 (band "soon"), so it renders behind 100 filler
    // cards — it only appears at all because the list is now fetched in full.
    await taskTitle(authedPage, GOLDEN.tasks.parent).click();

    const pane = authedPage.getByRole('complementary');
    await expect(pane.getByRole('heading', { level: 3, name: 'Subtasks · 1/2' })).toBeVisible();
    await expect(taskTitle(pane, GOLDEN.tasks.subtaskOpen)).toBeVisible();
    await expect(taskTitle(pane, GOLDEN.tasks.subtaskDone)).toBeVisible();
});

test("the card's subtask chip and its checklist agree", async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    // The chip's count comes from the server-side aggregate; the checklist it
    // opens comes from a request. Disagreement between them was the bug.
    const chip = authedPage.getByTitle('1 of 2 subtasks done');
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(authedPage.getByText(GOLDEN.tasks.subtaskOpen)).toBeVisible();
    await expect(authedPage.getByText('All subtasks complete.')).toBeHidden();
});

test('adding a subtask refreshes the parent-scoped query', async ({ authedPage }) => {
    // The pane's query key now carries `parentId`, while `useCreateTask`
    // invalidates `['tasks', { profileId }]`. That only reaches the pane because
    // TanStack matches object keys partially — if it didn't, a new subtask would
    // sit invisible until the 60s staleTime expired.
    await gotoAppRoute(authedPage, '/');
    await taskTitle(authedPage, GOLDEN.tasks.parent).click();

    const pane = authedPage.getByRole('complementary');
    await expect(pane.getByRole('heading', { level: 3, name: 'Subtasks · 1/2' })).toBeVisible();

    await pane.getByLabel('New subtask title').fill('Freshly added subtask');
    await pane.getByLabel('New subtask title').press('Enter');

    await expect(taskTitle(pane, 'Freshly added subtask')).toBeVisible();
    await expect(pane.getByRole('heading', { level: 3, name: 'Subtasks · 1/3' })).toBeVisible();
});

test('top-level cards survive past 100 active tasks', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    // Golden tasks from every band, all of which sort behind the filler.
    await expect(taskTitle(authedPage, GOLDEN.tasks.parent)).toBeVisible();
    await expect(taskTitle(authedPage, GOLDEN.tasks.soon)).toBeVisible();

    // The header tally counts rendered cards, so a truncated list showed 100.
    await expect(authedPage.getByText(/\d+ open/)).toBeVisible();
    const subline = await authedPage.getByText(/\d+ open/).innerText();
    const openCount = Number(subline.match(/(\d+) open/)![1]);
    expect(openCount).toBeGreaterThan(PAGE_SIZE);
});
