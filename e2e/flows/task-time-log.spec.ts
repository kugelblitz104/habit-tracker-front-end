import type { Locator, Page, Response } from '@playwright/test';

import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * `TaskTimeLog` renders only for a task that has entries. The section carries no
 * "add entry" control, so an empty one is a heading over a dead end — and the
 * task detail pane is short enough that a permanently empty block is most of it.
 *
 * The golden dataset gives both cases: `tasks.now` has one stopwatch entry,
 * `tasks.whenever` has none at all.
 */

const detailPane = (page: Page): Locator => page.getByRole('complementary');

const timeLogHeading = (pane: Locator): Locator =>
    pane.getByRole('heading', { name: 'Time log', exact: true });

/**
 * Open a task's pane from All tasks, and hand back the pane plus the pane's own
 * `GET /time-entries/` response. Asserting an ABSENT heading needs that second
 * handle: without it, "no time log" is indistinguishable from "the query hasn't
 * resolved yet", and the test would pass with the feature reverted.
 *
 * The promise is created before the click because the request fires on pane
 * mount — waiting for it afterwards could miss a response that already landed.
 */
const openTaskPane = async (
    page: Page,
    title: string
): Promise<{ pane: Locator; entriesLoaded: Promise<Response> }> => {
    await gotoAppRoute(page, '/tasks');
    const listTitle = taskRowTitle(page, title);
    await expect(listTitle).toBeVisible();

    const entriesLoaded = page.waitForResponse(
        // task_id scopes this to the pane's own query, not any other
        // /time-entries/ read the page might make.
        (response) => /\/time-entries\/\?.*task_id=/.test(response.url()) && response.ok()
    );
    await listTitle.click();

    const pane = detailPane(page);
    await expect(pane.getByRole('heading', { name: title, exact: true })).toBeVisible();
    return { pane, entriesLoaded };
};

test('a task with tracked time still shows its time log', async ({ authedPage }) => {
    const { pane, entriesLoaded } = await openTaskPane(authedPage, GOLDEN.tasks.now);
    await entriesLoaded;

    await expect(timeLogHeading(pane)).toBeVisible();
    // The golden entry's label, proving the log rendered its rows and not just a header.
    await expect(pane.getByText('Focus block', { exact: true })).toBeVisible();
});

test('a task with no tracked time shows no time log at all', async ({ authedPage }) => {
    const { pane, entriesLoaded } = await openTaskPane(authedPage, GOLDEN.tasks.whenever);

    const entries = (await (await entriesLoaded).json()).time_entries;
    expect(entries, `${GOLDEN.tasks.whenever} must have no time entries`).toEqual([]);

    await expect(timeLogHeading(pane)).toHaveCount(0);
    await expect(pane.getByText('No time tracked for this task yet.')).toHaveCount(0);
});
