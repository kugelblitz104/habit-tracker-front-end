import type { APIRequestContext, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { dayFrom } from '../fixtures/clock';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Retiring countdowns, both halves of it.
 *
 * A countdown with no linked task has nothing that can ever resolve it, so once
 * its target day has gone it reads as Past rather than Overdue: a client-side
 * rule (`applyPastRule`), collapsed into its own band. Archiving is the stored
 * half: `archived_date` on the row, and the API's `archived` filter decides
 * which list a surface gets, so an archived countdown is absent from the live
 * one entirely rather than filtered out in the browser.
 *
 * The golden profile supplies the task-less past countdown; a task-linked
 * overdue one is seeded here, because the golden linked countdown is in the
 * future and nothing else in the fixture is overdue.
 */

const LINKED_OVERDUE = 'ARCHIVEPROBE overdue with a task';

/** The `<section>` for a band, identified by its uppercase mono heading. */
const bandSection = (page: Page, label: string) =>
    page.locator('section').filter({
        has: page.getByRole('heading', { level: 2, name: label, exact: true })
    });

/** Seed a countdown whose target has passed, attached to a new task. */
const seedLinkedOverdue = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    anchor: Date
): Promise<void> => {
    const task = await api.post('/tasks/', {
        headers: authHeaders(account),
        data: { profile_id: profileId, title: 'ARCHIVEPROBE host task' }
    });
    expect(task.ok(), `seed task failed: ${task.status()} ${await task.text()}`).toBeTruthy();

    const countdown = await api.post('/countdowns/', {
        headers: authHeaders(account),
        data: {
            profile_id: profileId,
            title: LINKED_OVERDUE,
            target_date: dayFrom(anchor, -4),
            task_id: (await task.json()).id,
            repeat: 'none',
            show_occurrence: false
        }
    });
    expect(
        countdown.ok(),
        `seed countdown failed: ${countdown.status()} ${await countdown.text()}`
    ).toBeTruthy();
};

test('a passed countdown reads as Past without a task, and Overdue with one', async ({
    api,
    account,
    goldenProfileId,
    anchor,
    authedPage
}) => {
    await seedLinkedOverdue(api, account, goldenProfileId, anchor);
    await gotoAppRoute(authedPage, '/countdown');
    await expect(authedPage.getByText(GOLDEN.countdowns.future, { exact: true })).toBeVisible();

    // Task-linked: still Overdue, which is the signal completing the task clears.
    await expect(
        bandSection(authedPage, 'Overdue').getByText(LINKED_OVERDUE, { exact: true })
    ).toBeVisible();

    // Task-less: in Past, and collapsed. The count is on the header, the card is
    // not rendered until it is expanded.
    const past = bandSection(authedPage, 'Past');
    await expect(past.getByText(GOLDEN.countdowns.past, { exact: true })).toHaveCount(0);
    await past.getByRole('button', { expanded: false }).click();
    await expect(past.getByText(GOLDEN.countdowns.past, { exact: true })).toBeVisible();

    // Grouping by category must not resurrect it into a category section.
    // Case-insensitive: the toggle's label is lowercase text rendered uppercase.
    await authedPage.getByRole('button', { name: /^category$/i }).click();
    await expect(bandSection(authedPage, 'Past')).toHaveCount(1);
});

test('archiving moves a countdown to the archived list and back', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/countdown');
    const past = bandSection(authedPage, 'Past');
    await past.getByRole('button', { expanded: false }).click();

    await past.getByRole('button', { name: 'Archive countdown' }).click();
    await expect(authedPage.getByText('Countdown archived')).toBeVisible();
    // Gone from the live list entirely: the server filtered it out, so no Past
    // band remains for the only countdown that was in it.
    await expect(bandSection(authedPage, 'Past')).toHaveCount(0);

    await authedPage.getByRole('button', { name: 'Show archived countdowns' }).click();
    const archived = bandSection(authedPage, 'Archived');
    await expect(archived.getByText(GOLDEN.countdowns.past, { exact: true })).toBeVisible();
    await expect(archived.getByText(/Archived /)).toBeVisible();
    // The live countdowns are the ones absent now.
    await expect(archived.getByText(GOLDEN.countdowns.future, { exact: true })).toHaveCount(0);

    await archived.getByRole('button', { name: 'Restore countdown' }).click();
    await expect(authedPage.getByText('Countdown restored')).toBeVisible();
    await expect(authedPage.getByText('Nothing archived yet.', { exact: false })).toBeVisible();

    await authedPage.getByRole('button', { name: 'Show live countdowns' }).click();
    // Still expanded from earlier in this test: the collapse is component state,
    // so switching lists does not fold it back up.
    const restored = bandSection(authedPage, 'Past');
    await expect(restored.getByRole('button', { expanded: true })).toBeVisible();
    await expect(restored.getByText(GOLDEN.countdowns.past, { exact: true })).toBeVisible();
});

test('the Today countdown section leaves out what has already gone', async ({
    api,
    account,
    goldenProfileId,
    anchor,
    authedPage
}) => {
    await seedLinkedOverdue(api, account, goldenProfileId, anchor);
    await gotoAppRoute(authedPage, '/');

    const section = authedPage.locator('section').filter({
        has: authedPage.getByRole('heading', { level: 2, name: 'Countdowns', exact: true })
    });
    // Both of these are inside the default 90-day look-ahead; the golden "far
    // future" one (120 days) deliberately is not, so it is no use here.
    await expect(section.getByText(GOLDEN.countdowns.linked, { exact: true })).toBeVisible();
    // The task-linked overdue one is still live, so Today keeps showing it.
    await expect(section.getByText(LINKED_OVERDUE, { exact: true })).toBeVisible();
    await expect(section.getByText(GOLDEN.countdowns.past, { exact: true })).toHaveCount(0);
});
