import type { APIRequestContext, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Locks multi-select on the All-tasks surface, ahead of extracting the duplicated
 * `visibleIds` memo (All-tasks + the project view build it identically).
 *
 * The load-bearing detail is that "All" selects the tasks currently VISIBLE under
 * the active filters, not everything the page has loaded — so every test here sets
 * a filter first and checks the two numbers differ. The golden profile loads 11
 * tasks (9 top-level + 2 subtasks), shows 8 (subtasks are managed by their parent,
 * the closed one sits behind the Status filter), and narrows to 2 with the Beta
 * project filter.
 */

const VISIBLE_UNFILTERED = 8;
const VISIBLE_IN_BETA = 2;

const betaTasks = [GOLDEN.tasks.deferred, GOLDEN.tasks.parent] as const;

const taskTitles = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<string[]> => {
    const response = await api.get('/tasks/', {
        headers: authHeaders(account),
        params: { profile_id: profileId, include_closed: true }
    });
    expect(response.ok(), `GET /tasks/ failed: ${response.status()}`).toBeTruthy();
    const { tasks } = await response.json();
    return tasks.map((task: { title: string }) => task.title);
};

const cardTitle = (page: Page, title: string) =>
    page.getByRole('button', { name: title, exact: true });

const selectionCheckbox = (page: Page, title: string) =>
    page.getByRole('checkbox', { name: `Select task: ${title}`, exact: true });

/** That card's round status control — scoped via the title button's card row. */
const expectCardStatus = async (page: Page, title: string, status: string) => {
    await expect(
        cardTitle(page, title)
            .locator('xpath=../..')
            .getByRole('button', { name: /^Status: / })
    ).toHaveAttribute('aria-label', new RegExp(`^Status: ${status}\\.`));
};

/** Enter multi-select mode and wait for the floating bulk-action bar. */
const enterSelectMode = async (page: Page) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await expect(page.getByText('0 selected')).toBeVisible();
};

/**
 * The controls bar's Project filter. Not reachable by label: the `<select>` sits
 * INSIDE its `<label>`, so the label's text (and the control's accessible name)
 * swallows every option — "Project All projects No project Alpha Project Beta
 * Project" — and a loose match would also hit the Group select. Its own options
 * identify it unambiguously instead.
 */
const projectFilter = (page: Page) =>
    page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'All projects' }) });

/** Narrow the list to the Beta project via the controls bar's Project filter. */
const filterToBeta = async (page: Page) => {
    await projectFilter(page).selectOption({ label: GOLDEN.projects.beta });
    for (const title of betaTasks) await expect(cardTitle(page, title)).toBeVisible();
    await expect(cardTitle(page, GOLDEN.tasks.now)).toHaveCount(0);
};

test('"All" selects only the tasks visible under the current filters', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    // 11 rows are loaded, so "everything loaded" and "everything visible" are
    // genuinely different numbers before any filter is even applied.
    expect((await taskTitles(api, account, goldenProfileId)).length).toBe(11);

    await gotoAppRoute(authedPage, '/tasks');
    await expect(cardTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    await enterSelectMode(authedPage);
    await authedPage.getByRole('button', { name: 'All', exact: true }).click();
    await expect(authedPage.getByText(`${VISIBLE_UNFILTERED} selected`)).toBeVisible();

    // Now filter, WITHOUT clearing the selection: re-running "All" must shrink the
    // set to the filtered view rather than leave the eight behind.
    await filterToBeta(authedPage);
    await authedPage.getByRole('button', { name: 'All', exact: true }).click();
    await expect(authedPage.getByText(`${VISIBLE_IN_BETA} selected`)).toBeVisible();
    for (const title of betaTasks) await expect(selectionCheckbox(authedPage, title)).toBeChecked();
});

test('a bulk status change applies to the selection', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/tasks');
    await expect(cardTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    await enterSelectMode(authedPage);
    await filterToBeta(authedPage);
    await authedPage.getByRole('button', { name: 'All', exact: true }).click();
    await expect(authedPage.getByText(`${VISIBLE_IN_BETA} selected`)).toBeVisible();

    // The bar's Status dropdown reuses the per-card status submenu. Blocked
    // (rather than Done) keeps the rows on screen, so the change is observable on
    // the cards themselves — and its label can't collide with the controls bar's
    // Select button, which reads "Done" while selection mode is on.
    await authedPage.getByRole('button', { name: 'Status', exact: true }).click();
    await authedPage.getByRole('button', { name: 'Blocked', exact: true }).click();

    await expect(authedPage.getByText(`${VISIBLE_IN_BETA} tasks updated`)).toBeVisible();
    for (const title of betaTasks) await expectCardStatus(authedPage, title, 'Blocked');

    // …and nothing outside the selection moved: the rest are still Open.
    await projectFilter(authedPage).selectOption({ label: 'All projects' });
    await expect(cardTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();
    await expectCardStatus(authedPage, GOLDEN.tasks.now, 'Open');
    await expectCardStatus(authedPage, GOLDEN.tasks.soon, 'Open');
});

test('bulk delete removes the selection after the native confirm', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/tasks');
    await expect(cardTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    await enterSelectMode(authedPage);
    await filterToBeta(authedPage);
    await authedPage.getByRole('button', { name: 'All', exact: true }).click();
    await expect(authedPage.getByText(`${VISIBLE_IN_BETA} selected`)).toBeVisible();

    // `useBulkTaskActions` guards the delete with window.confirm, which Playwright
    // auto-dismisses unless a dialog handler accepts it.
    const prompts: string[] = [];
    authedPage.on('dialog', async (dialog) => {
        prompts.push(dialog.message());
        await dialog.accept();
    });

    await authedPage.getByRole('button', { name: 'Delete selected' }).click();

    await expect(authedPage.getByText(`${VISIBLE_IN_BETA} tasks deleted`)).toBeVisible();
    expect(prompts).toEqual([`Delete ${VISIBLE_IN_BETA} tasks? This cannot be undone.`]);

    // Deleting exits selection mode, so the bulk bar goes away.
    await expect(authedPage.getByRole('button', { name: 'Delete selected' })).toHaveCount(0);

    // Gone server-side too, and the parent's subtasks cascaded with it — 11 rows
    // minus the parent, its two subtasks and the deferred task.
    const remaining = await taskTitles(api, account, goldenProfileId);
    expect(remaining).not.toContain(GOLDEN.tasks.parent);
    expect(remaining).not.toContain(GOLDEN.tasks.deferred);
    expect(remaining).not.toContain(GOLDEN.tasks.subtaskOpen);
    expect(remaining).toContain(GOLDEN.tasks.now);
    expect(remaining.length).toBe(7);
});
