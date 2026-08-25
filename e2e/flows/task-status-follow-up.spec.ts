import type { Page } from '@playwright/test';

import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * Two statuses mean nothing on their own: Blocked needs a `block_reason` for the
 * detail header's banner, and Scheduled needs a `scheduled_date` that
 * `compute_band` and the Today schedule both read. Picking either one used to
 * write `status` alone, leaving an empty red banner or a scheduled task with no
 * date, recoverable only by opening the editor.
 *
 * The picker now offers the second field as a step inside the same popover.
 * It is an OFFER: dismissing commits the status change with the field null, so
 * the pick never gets more expensive than it was.
 */

const REASON = 'waiting on DBA';

/** Open the task's detail pane from Today. */
const openPane = async (page: Page, title: string) => {
    await gotoAppRoute(page, '/');
    await taskRowTitle(page, title).click();
    const pane = page.getByRole('complementary');
    await expect(pane.getByRole('heading', { name: title, exact: true })).toBeVisible();
    return pane;
};

/** The header's labelled status pill. */
const statusPill = (pane: ReturnType<Page['getByRole']>) =>
    pane.getByRole('button', { name: /^Status: / });

const pickStatus = async (pane: ReturnType<Page['getByRole']>, label: string) => {
    await statusPill(pane).click();
    await pane.page().getByRole('button', { name: label, exact: true }).click();
};

test('picking Blocked offers a reason, and saving it fills the banner', async ({ authedPage }) => {
    const pane = await openPane(authedPage, GOLDEN.tasks.now);

    await pickStatus(pane, 'Blocked');

    const reason = authedPage.getByRole('textbox', { name: 'Blocked on' });
    await expect(reason).toBeVisible();
    await reason.fill(REASON);
    await reason.press('Enter');

    await expect(pane.getByText(`Blocked: ${REASON}`)).toBeVisible();
});

test('dismissing the reason still changes the status, leaving it blank', async ({ authedPage }) => {
    // The accepted trade-off: the prompt is an offer, so the status write is
    // never contingent on it. Characterization, not a defect.
    const pane = await openPane(authedPage, GOLDEN.tasks.now);

    await pickStatus(pane, 'Blocked');
    await expect(authedPage.getByRole('textbox', { name: 'Blocked on' })).toBeVisible();
    await authedPage.keyboard.press('Escape');

    await expect(statusPill(pane)).toHaveAttribute('aria-label', /^Status: Blocked\./);
    await expect(pane.getByText(/^Blocked: /)).toHaveCount(0);
});

test('re-picking Blocked pre-fills the reason the task already has', async ({ authedPage }) => {
    // block_reason deliberately survives a move off Blocked, so someone who
    // un-blocked by mistake gets their reason back rather than retyping it.
    const pane = await openPane(authedPage, GOLDEN.tasks.now);

    await pickStatus(pane, 'Blocked');
    await authedPage.getByRole('textbox', { name: 'Blocked on' }).fill(REASON);
    await authedPage.getByRole('textbox', { name: 'Blocked on' }).press('Enter');
    await expect(pane.getByText(`Blocked: ${REASON}`)).toBeVisible();

    await pickStatus(pane, 'Open');
    await expect(statusPill(pane)).toHaveAttribute('aria-label', /^Status: Open\./);

    await pickStatus(pane, 'Blocked');
    await expect(authedPage.getByRole('textbox', { name: 'Blocked on' })).toHaveValue(REASON);
});

test('picking Scheduled offers a date, and saving it sticks', async ({ authedPage }) => {
    const pane = await openPane(authedPage, GOLDEN.tasks.now);

    await pickStatus(pane, 'Scheduled');

    const date = authedPage.getByRole('textbox', { name: 'Scheduled for date' });
    await expect(date).toBeVisible();
    // Well clear of the run anchor, so no assertion depends on a time of day.
    // The input commits on change; there is no save button on this step.
    await date.fill('2026-12-01');

    await expect(statusPill(pane)).toHaveAttribute('aria-label', /^Status: Scheduled\./);

    // Re-opening shows the stored date rather than an empty field.
    await pickStatus(pane, 'Scheduled');
    await expect(authedPage.getByRole('textbox', { name: 'Scheduled for date' })).toHaveValue(
        '2026-12-01'
    );
});

test('the scheduled step offers the same quick picks the context menu does', async ({
    authedPage
}) => {
    // It reuses DateSubmenu outright, so Today / Tomorrow / Next week come for
    // free rather than being a second date grammar to keep in step.
    const pane = await openPane(authedPage, GOLDEN.tasks.now);

    await pickStatus(pane, 'Scheduled');

    // Scoped to the step's own panel via its back header: the quick-pick rows
    // carry their resolved date in the accessible name ("Tomorrow Aug 25th"),
    // and a bare "Today" also matches controls elsewhere on the page.
    const step = authedPage.getByRole('button', { name: 'Scheduled for' }).locator('xpath=..');
    for (const quick of ['Today', 'Tomorrow', 'Next week']) {
        await expect(step.getByRole('button', { name: new RegExp(`^${quick} `) })).toBeVisible();
    }

    await step.getByRole('button', { name: /^Tomorrow / }).click();
    await expect(statusPill(pane)).toHaveAttribute('aria-label', /^Status: Scheduled\./);

    // Tomorrow relative to the run, computed the same way DateSubmenu does.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = tomorrow.toISOString().slice(0, 10);

    await pickStatus(pane, 'Scheduled');
    await expect(authedPage.getByRole('textbox', { name: 'Scheduled for date' })).toHaveValue(
        expected
    );
});

test('the editor picks status with the same control, revealing the reason field', async ({
    authedPage
}) => {
    // TaskEditor had no status control at all; its block-reason and scheduled
    // blocks were gated on a value nothing inside the editor could change.
    const pane = await openPane(authedPage, GOLDEN.tasks.now);
    await pane.getByRole('button', { name: 'Edit task' }).click();

    await expect(pane.getByRole('textbox', { name: 'Block reason' })).toHaveCount(0);

    await pickStatus(pane, 'Blocked');
    await authedPage.keyboard.press('Escape');

    await expect(pane.getByRole('textbox', { name: 'Block reason' })).toBeVisible();
});

test('a reason saved from the prompt survives the editor form save', async ({ authedPage }) => {
    // The editor seeds blockReason into local state at mount and buildPatch
    // diffs against it, so a reason the prompt saved while the editor was open
    // would be sent back as null on Save: silent data loss, not a visible break.
    const pane = await openPane(authedPage, GOLDEN.tasks.now);
    await pane.getByRole('button', { name: 'Edit task' }).click();

    await pickStatus(pane, 'Blocked');
    await authedPage.getByRole('textbox', { name: 'Blocked on' }).fill(REASON);

    // Wait for the refetch the follow-up triggers before saving the form. Without
    // it the editor's `task` prop is still pre-prompt, so its stale-null reason
    // agrees with the empty local field and buildPatch sends nothing at all, so
    // the test would pass by racing rather than by the mirror working.
    const refetched = authedPage.waitForResponse(
        (r) => r.request().method() === 'GET' && /\/tasks\//.test(r.url())
    );
    await authedPage.getByRole('textbox', { name: 'Blocked on' }).press('Enter');
    await refetched;

    // Save the form without touching the reason field the prompt just populated.
    await pane.getByRole('button', { name: 'Save', exact: true }).click();

    // Re-read from the server rather than trusting the render still on screen:
    // the wiping PATCH resolves after the editor closes, so asserting the cached
    // banner here passes even when the reason has just been nulled.
    const reopened = await openPane(authedPage, GOLDEN.tasks.now);
    await expect(reopened.getByText(`Blocked: ${REASON}`)).toBeVisible();
});

test('the context menu offers the reason too, and stays open to ask', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');
    await taskRowTitle(authedPage, GOLDEN.tasks.now).click({ button: 'right' });

    const menu = authedPage.getByRole('menu', { name: `Task actions: ${GOLDEN.tasks.now}` });
    await menu.getByRole('button', { name: /^Status/ }).click();
    await menu.getByRole('button', { name: 'Blocked', exact: true }).click();

    // The menu closes on every other status pick; here it has to stay up.
    const reason = menu.getByRole('textbox', { name: 'Blocked on' });
    await expect(reason).toBeVisible();
    await reason.fill(REASON);
    await reason.press('Enter');

    const pane = await openPane(authedPage, GOLDEN.tasks.now);
    await expect(pane.getByText(`Blocked: ${REASON}`)).toBeVisible();
});

test('a subtask is never asked for a reason, only for its status', async ({ authedPage }) => {
    // Subtasks surface only their status; block_reason and scheduled_date have
    // nowhere to render on one, so asking for them would collect a value the
    // user could never see again. A subtask needing either gets promoted.
    const pane = await openPane(authedPage, GOLDEN.tasks.parent);

    const row = pane.getByRole('button', { name: GOLDEN.tasks.subtaskOpen }).locator('xpath=..');
    await row.getByRole('button', { name: /^Status: / }).click();
    await authedPage.getByRole('button', { name: 'Blocked', exact: true }).click();

    await expect(authedPage.getByRole('textbox', { name: 'Blocked on' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /^Status: / })).toHaveAttribute(
        'aria-label',
        /^Status: Blocked\./
    );
});

test('a status needing no second field closes the picker as before', async ({ authedPage }) => {
    const pane = await openPane(authedPage, GOLDEN.tasks.now);

    await pickStatus(pane, 'In progress');

    await expect(statusPill(pane)).toHaveAttribute('aria-label', /^Status: In progress\./);
    await expect(authedPage.getByRole('textbox', { name: 'Blocked on' })).toHaveCount(0);
});
