import type { APIRequestContext, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

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

const cardTitle = (page: Page, title: string) => taskRowTitle(page, title);

const selectionCheckbox = (page: Page, title: string) =>
    page.getByRole('checkbox', { name: `Select task: ${title}`, exact: true });

/**
 * That card's round status control, scoped via the title button's row. Three
 * levels up: the title's parent is the line-1 (title/due/priority) wrapper,
 * its parent is the content column, and ITS parent is the row that also holds
 * the StatusControl.
 */
const expectCardStatus = async (page: Page, title: string, status: string) => {
    await expect(
        cardTitle(page, title)
            .locator('xpath=../../..')
            .getByRole('button', { name: /^Status: / })
    ).toHaveAttribute('aria-label', new RegExp(`^Status: ${status}\\.`));
};

/** Enter multi-select mode and wait for the floating bulk-action bar. */
const enterSelectMode = async (page: Page) => {
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await expect(page.getByText('0 selected')).toBeVisible();
};

/**
 * The controls bar's Filters popover trigger. Its accessible name gains a
 * `(n)` suffix once a filter is active, so the match is a prefix rather than
 * exact.
 */
const filtersButton = (page: Page) => page.getByRole('button', { name: /^Filters/ });

/**
 * The controls bar's Project filter, reachable only once the Filters popover
 * is open. Not reachable by label: the `<select>` sits inside a plain `<div>`
 * with no label association, so its own options identify it instead of its
 * (nonexistent) accessible name.
 */
const projectFilter = (page: Page) =>
    page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'All projects' }) });

/** Narrow the list to the Beta project via the controls bar's Project filter. */
const filterToBeta = async (page: Page) => {
    await filtersButton(page).click();
    await projectFilter(page).selectOption({ label: GOLDEN.projects.beta });
    await page.keyboard.press('Escape');
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

test('clicking the selection checkbox does not also open the detail pane', async ({
    authedPage
}) => {
    // The row itself is now a click target (task-row-redesign final fixes, item
    // 2), so this pins that the checkbox's own click handler still swallows the
    // click rather than letting it bubble and also select the row for the
    // detail pane.
    await gotoAppRoute(authedPage, '/tasks');
    await expect(cardTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    await enterSelectMode(authedPage);
    await expect(authedPage.getByRole('complementary')).toHaveCount(0);

    await selectionCheckbox(authedPage, GOLDEN.tasks.now).click();
    await expect(selectionCheckbox(authedPage, GOLDEN.tasks.now)).toBeChecked();
    await expect(authedPage.getByRole('complementary')).toHaveCount(0);
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
    await filtersButton(authedPage).click();
    await projectFilter(authedPage).selectOption({ label: 'All projects' });
    await authedPage.keyboard.press('Escape');
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

/**
 * Priority/Status/Date render their filter bodies inline inside the Filters
 * popover rather than as their own nested Headless UI `Popover`s, precisely so
 * that an inner interaction doesn't trigger the outer popover's dismiss
 * handler. A regression here (e.g. reintroducing a nested `Popover`) would
 * close the panel on the very first click, so this pins that it stays open.
 * That's the load-bearing guarantee the whole body-extraction exists for.
 * Filed alongside the other filter-bar mechanics in this file rather than in
 * its own spec, since `filtersButton` already lives here.
 */
test('the Filters popover stays open across an inner checkbox toggle, and a chip clears only itself', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/tasks');
    await expect(cardTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    await filtersButton(authedPage).click();
    const highCheckbox = authedPage.getByRole('checkbox', { name: 'High', exact: true });
    await expect(highCheckbox).toBeVisible();

    // High is checked by default (ALL_PRIORITY_VALUES); unchecking it is a
    // real filter change. If this click closed the popover, the assertions
    // below would fail because the checkbox would no longer be in the DOM.
    await highCheckbox.click();
    await expect(highCheckbox).not.toBeChecked();

    const openCheckbox = authedPage.getByRole('checkbox', { name: 'Open', exact: true });
    await expect(openCheckbox).toBeVisible();
    await openCheckbox.click();
    await expect(openCheckbox).not.toBeChecked();

    await authedPage.keyboard.press('Escape');

    // Both toggles landed: two active filters, one chip each.
    await expect(
        authedPage.getByRole('button', { name: 'Filters (2)', exact: true })
    ).toBeVisible();
    const priorityChip = authedPage.getByText(/^Priority: /);
    const statusChip = authedPage.getByText(/^Status: /);
    await expect(priorityChip).toBeVisible();
    await expect(statusChip).toBeVisible();

    // The chip's X decrements the badge and leaves the other chip in place.
    await authedPage.getByRole('button', { name: /^Remove filter: Priority:/ }).click();
    await expect(
        authedPage.getByRole('button', { name: 'Filters (1)', exact: true })
    ).toBeVisible();
    await expect(priorityChip).toHaveCount(0);
    await expect(statusChip).toBeVisible();
});
