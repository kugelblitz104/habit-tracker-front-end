import type { APIRequestContext, Page } from '@playwright/test';

import { API_BASE, authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Locks the per-surface "change a task's status from the list" behaviour that
 * Today, All-tasks and the project view each implement with their own copy of the
 * handler (`handleStatusChange` × 3). The upcoming `useTaskStatusChange` hook
 * replaces all three, so every surface has to keep behaving identically:
 *
 *  - completing/cancelling moves the task out of its band into the Closed section
 *  - the toast carries an Undo that puts the PREVIOUS status back
 *  - a failed PATCH surfaces an error toast
 *
 * The project view used to skip the error toast (no `onError`); the shared
 * `useTaskStatusChange` hook now covers all three surfaces identically.
 */

const CLOSING = [
    { label: 'Done', toast: 'Task completed' },
    { label: 'Cancelled', toast: 'Task cancelled' }
] as const;

/** Body the intercepted PATCH answers with; `apiErrorMessage` prefers `detail`. */
const FAILURE_DETAIL = 'Simulated status change failure';

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
    const { projects } = await response.json();
    const alpha = projects.find((p: { name: string }) => p.name === GOLDEN.projects.alpha);
    expect(alpha, `no project named ${GOLDEN.projects.alpha}`).toBeTruthy();
    return alpha.id as number;
};

/** The card whose title is `title` — task cards carry no test ids. */
const cardTitle = (page: Page, title: string) =>
    page.getByRole('button', { name: title, exact: true });

/**
 * The round status control on that card. Anchored off the title button (whose
 * accessible name IS the title) and stepped up two levels to the card's flex row,
 * which also holds the status picker — every card renders a "Status: …" button, so
 * it has to be scoped to one card rather than matched page-wide.
 */
const statusControl = (page: Page, title: string) =>
    cardTitle(page, title)
        .locator('xpath=../..')
        .getByRole('button', { name: /^Status: / });

/** Open a card's status picker and pick `label`. */
const setStatus = async (page: Page, title: string, label: string) => {
    await statusControl(page, title).click();
    await page.getByRole('button', { name: label, exact: true }).click();
};

const expectStatus = async (page: Page, title: string, label: string) => {
    await expect(statusControl(page, title)).toHaveAttribute(
        'aria-label',
        new RegExp(`^Status: ${label}\\.`)
    );
};

/**
 * Check Done + Cancelled in the Status filter so the Closed section renders.
 * `showClosedSection` keeps it hidden on the flat surfaces until the user asks
 * for closed statuses; Today always shows it, hence the per-surface flag.
 */
const revealClosedSection = async (page: Page) => {
    // 8 of the 10 statuses are selected by default (everything but Done/Cancelled).
    await page.getByRole('button', { name: 'Status (8)' }).click();
    await page.getByRole('checkbox', { name: 'Done', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Cancelled', exact: true }).click();
    await page.keyboard.press('Escape');
};

type Surface = {
    label: string;
    /** Resolved per test, since the project route needs a real id. */
    path: (projectId: number) => string;
    /** The flat surfaces gate the Closed section behind the Status filter. */
    needsClosedFilter: boolean;
};

const SURFACES: Surface[] = [
    { label: 'Today', path: () => '/', needsClosedFilter: false },
    { label: 'All tasks', path: () => '/tasks', needsClosedFilter: true },
    { label: 'Project view', path: (id) => `/projects/${id}`, needsClosedFilter: true }
];

for (const surface of SURFACES) {
    for (const closing of CLOSING) {
        test(`${
            surface.label
        }: marking a task ${closing.label.toLowerCase()} moves it into the Closed section`, async ({
            api,
            account,
            goldenProfileId,
            authedPage
        }) => {
            const projectId = await alphaProjectId(api, account, goldenProfileId);
            await gotoAppRoute(authedPage, surface.path(projectId));

            // Alpha's Now-band task, so the same task is on all three surfaces.
            const title = GOLDEN.tasks.now;
            await expect(cardTitle(authedPage, title)).toBeVisible();

            if (surface.needsClosedFilter) await revealClosedSection(authedPage);
            // The golden dataset ships exactly one closed top-level task in Alpha,
            // so the disclosure count is a precise before/after measure of the move.
            await expect(authedPage.getByRole('button', { name: 'Closed 1' })).toBeVisible();

            await setStatus(authedPage, title, closing.label);

            // Out of its band: the card is gone from the active list, and the
            // (collapsed, so unmounted) Closed disclosure now counts 2.
            await expect(authedPage.getByRole('button', { name: 'Closed 2' })).toBeVisible();
            await expect(cardTitle(authedPage, title)).toHaveCount(0);

            // …and into the Closed section.
            await authedPage.getByRole('button', { name: 'Closed 2' }).click();
            await expect(cardTitle(authedPage, title)).toBeVisible();
        });

        test(`${
            surface.label
        }: the ${closing.label.toLowerCase()} undo toast restores the previous status`, async ({
            api,
            account,
            goldenProfileId,
            authedPage
        }) => {
            const projectId = await alphaProjectId(api, account, goldenProfileId);
            await gotoAppRoute(authedPage, surface.path(projectId));

            const title = GOLDEN.tasks.now;
            await expect(cardTitle(authedPage, title)).toBeVisible();

            // Park it on a non-default status first (a non-closing pick applies
            // immediately, with no toast). Without this, "restored" and "reset to
            // Open" would be indistinguishable — priority 3 keeps it in Now either
            // way, so the band doesn't change.
            await setStatus(authedPage, title, 'Blocked');
            await expectStatus(authedPage, title, 'Blocked');

            await setStatus(authedPage, title, closing.label);
            await expect(authedPage.getByText(closing.toast)).toBeVisible();

            await authedPage.getByRole('button', { name: 'Undo', exact: true }).click();

            // Back in its band at the status it had before — not merely reopened.
            await expectStatus(authedPage, title, 'Blocked');
        });
    }

    test(`${surface.label}: a failed status change surfaces an error toast`, async ({
        api,
        account,
        goldenProfileId,
        authedPage
    }) => {
        const projectId = await alphaProjectId(api, account, goldenProfileId);

        await authedPage.route(`${API_BASE}/tasks/*`, async (route) => {
            if (route.request().method() !== 'PATCH') return route.continue();
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ detail: FAILURE_DETAIL })
            });
        });

        await gotoAppRoute(authedPage, surface.path(projectId));

        const title = GOLDEN.tasks.now;
        await expect(cardTitle(authedPage, title)).toBeVisible();
        await setStatus(authedPage, title, 'Done');

        await expect(authedPage.getByText(FAILURE_DETAIL)).toBeVisible();
        // And no success toast — proof the PATCH really was rejected.
        await expect(authedPage.getByText('Task completed')).toHaveCount(0);
    });
}
