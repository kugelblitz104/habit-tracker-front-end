import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The two connection lists on /settings — calendars (ICS subscriptions) and task
 * trackers (Azure DevOps / GitHub).
 *
 * They are near-duplicates today and a shared set of row primitives is about to
 * be extracted from them, so this spec pins the shared behaviours: how a row
 * renders (name + provider suffix + colour pip), the two-step INLINE remove
 * confirm (not a modal), the row <-> edit-form swap, and the `last_error`
 * warning row.
 *
 * ## Why the connections are seeded here rather than in the golden dataset
 *
 * `golden-profile.ts` ships `calendar_connections: []` and
 * `integration_connections: []` on purpose — an enabled calendar connection makes
 * the backend fetch its ICS URL on every /events request, and integration
 * connections come back from a backup disabled and tokenless (PATs are never
 * round-tripped). So both lists are seeded per-test through the API.
 *
 * ## Why the ICS URLs point at a dead local port
 *
 * The backend really does fetch a calendar's URL, so pointing at anything real
 * would make this spec depend on an external service. `http://127.0.0.1:9/...`
 * (the discard port, from inside the API container) is refused immediately
 * instead of burning the 10s fetch timeout — and the resulting `last_error` is
 * exactly what the warning-row test needs.
 *
 * ## What is deliberately NOT asserted
 *
 * The two lists' colour pips differ by 1px of border radius today
 * (`rounded-[3px]` for calendars, `rounded-[2px]` for integrations). That gap is
 * being normalised in the same refactor, so asserting it would guarantee a
 * false failure. Only the shared parts of the pip are pinned.
 */

const DEAD_ICS = (name: string) => `http://127.0.0.1:9/${name}.ics`;

const CAL = {
    /** Enabled, so `GET /events` reaches it and stamps a `last_error`. */
    broken: { name: 'E2E Broken Calendar', provider: 'Proton', color: '#6f9fe0' },
    /** Disabled, so it is skipped by /events and stays error-free. */
    quiet: { name: 'E2E Quiet Calendar', provider: 'Google', color: '#33cc88' }
} as const;

const INTEGRATION = {
    name: 'E2E Contoso ADO',
    organization: 'e2e-contoso',
    project: 'Payments'
} as const;

const seedCalendars = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<void> => {
    for (const [key, seed] of Object.entries(CAL)) {
        const response = await api.post('/calendar-connections/', {
            headers: authHeaders(account),
            data: {
                profile_id: profileId,
                name: seed.name,
                color: seed.color,
                url: DEAD_ICS(key),
                provider: seed.provider,
                enabled: key === 'broken'
            }
        });
        expect(
            response.ok(),
            `seed calendar ${seed.name}: ${response.status()} ${await response.text()}`
        ).toBeTruthy();
    }
};

/**
 * Force one ICS refresh so the enabled connection records its failure. The
 * endpoint answers 200 with the failure in `errors[]` (a dead feed never fails
 * the whole response), and commits `last_error` on the row.
 */
const triggerIcsFetch = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<void> => {
    const response = await api.get('/calendar-connections/events', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `events: ${response.status()} ${await response.text()}`).toBeTruthy();
    const body = await response.json();
    expect(body.errors.join(' '), 'the dead feed should have reported a fetch failure').toContain(
        CAL.broken.name
    );
};

const seedIntegration = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<void> => {
    const response = await api.post('/integrations/', {
        headers: authHeaders(account),
        data: {
            profile_id: profileId,
            provider: 'azure_devops',
            name: INTEGRATION.name,
            token: 'e2e-not-a-real-pat',
            organization: INTEGRATION.organization,
            project: INTEGRATION.project
        }
    });
    expect(
        response.ok(),
        `seed integration: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
};

/** The SettingsCard section for each list, keyed off its subtitle copy. */
const calendarsCard = (page: Page) =>
    page.locator('section').filter({ hasText: 'Calendars — read-only' });
const trackersCard = (page: Page) =>
    page.locator('section').filter({ hasText: 'pull your open items in, publish tasks out' });

/**
 * A connection row, found from the connection's own name and walked up to the
 * row container.
 *
 * Anchored on the name rather than on a control: the inline confirm swaps the
 * Edit/Remove/Sync buttons out, so a button-anchored row locator would go stale
 * at exactly the moment the confirm needs asserting.
 */
const rowFor = (page: Page, name: string): Locator =>
    page
        .getByText(name, { exact: true })
        .locator('xpath=ancestor::div[contains(@class,"rounded-[10px]")][1]');

const CAL_REMOVE = (name: string) => `Remove calendar "${name}"`;
const CAL_EDIT = (name: string) => `Edit calendar "${name}"`;
const INT_REMOVE = (name: string) => `Remove "${name}"`;
const INT_EDIT = (name: string) => `Edit "${name}"`;

test('both lists render a row with its name, provider suffix and colour pip', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedCalendars(api, account, goldenProfileId);
    await seedIntegration(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    const calendarRow = rowFor(authedPage, CAL.quiet.name);
    await expect(calendarRow).toBeVisible();
    await expect(calendarRow.getByText(CAL.quiet.name, { exact: true })).toBeVisible();
    // The provider is rendered as a mono " · <provider>" suffix beside the name,
    // not on its own line.
    await expect(calendarRow.getByText(`· ${CAL.quiet.provider}`)).toBeVisible();
    const calendarPip = calendarRow.locator('span[aria-hidden="true"]').first();
    // Presentational and 9x9 in both lists; the colour comes from the record.
    await expect(calendarPip).toHaveClass(/h-\[9px\] w-\[9px\] flex-none/);
    await expect(calendarPip).toHaveCSS('background-color', 'rgb(51, 204, 136)');

    const trackerRow = rowFor(authedPage, INTEGRATION.name);
    await expect(trackerRow).toBeVisible();
    await expect(trackerRow.getByText(INTEGRATION.name, { exact: true })).toBeVisible();
    // Integrations map the stored provider slug to a display label.
    await expect(trackerRow.getByText('· Azure DevOps')).toBeVisible();
    // Azure rows carry a second subline built from organization / project.
    await expect(
        trackerRow.getByText(`${INTEGRATION.organization} / ${INTEGRATION.project}`, {
            exact: true
        })
    ).toBeVisible();
    const trackerPip = trackerRow.locator('span[aria-hidden="true"]').first();
    await expect(trackerPip).toHaveClass(/h-\[9px\] w-\[9px\] flex-none/);
    // NOT asserted: the pips' border radius (rounded-[3px] vs rounded-[2px]) —
    // that 1px difference is being normalised deliberately.

    // Neither list uses a "0 connections" empty state once seeded.
    await expect(
        calendarsCard(authedPage).getByRole('button', { name: 'Connect a calendar' })
    ).toBeVisible();
    await expect(
        trackersCard(authedPage).getByRole('button', { name: 'Connect a task tracker' })
    ).toBeVisible();
});

test('Remove is a two-step inline confirm, and Cancel puts the row back', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedCalendars(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    const row = rowFor(authedPage, CAL.quiet.name);
    await expect(row).toBeVisible();

    await authedPage.getByRole('button', { name: CAL_REMOVE(CAL.quiet.name) }).click();

    // Inline, in the row itself — there is no dialog.
    await expect(row.getByText('Remove?', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(authedPage.getByRole('dialog')).toHaveCount(0);
    // The trigger controls are swapped out, not merely hidden alongside.
    await expect(authedPage.getByRole('button', { name: CAL_REMOVE(CAL.quiet.name) })).toHaveCount(
        0
    );
    await expect(authedPage.getByRole('button', { name: CAL_EDIT(CAL.quiet.name) })).toHaveCount(0);

    await row.getByRole('button', { name: 'Cancel' }).click();

    await expect(row.getByText('Remove?', { exact: true })).toHaveCount(0);
    await expect(
        authedPage.getByRole('button', { name: CAL_REMOVE(CAL.quiet.name) })
    ).toBeVisible();
    await expect(authedPage.getByRole('button', { name: CAL_EDIT(CAL.quiet.name) })).toBeVisible();
    // Cancel is not a silent delete.
    await expect(row.getByText(CAL.quiet.name, { exact: true })).toBeVisible();
});

test('Confirm removes the row, leaving the other rows alone', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedCalendars(api, account, goldenProfileId);
    await seedIntegration(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    const row = rowFor(authedPage, CAL.quiet.name);
    await expect(row).toBeVisible();
    await authedPage.getByRole('button', { name: CAL_REMOVE(CAL.quiet.name) }).click();
    await row.getByRole('button', { name: 'Confirm' }).click();

    await expect(authedPage.getByText(CAL.quiet.name, { exact: true })).toHaveCount(0);
    // The sibling calendar and the whole other list survive.
    await expect(authedPage.getByText(CAL.broken.name, { exact: true })).toBeVisible();
    await expect(authedPage.getByText(INTEGRATION.name, { exact: true })).toBeVisible();
});

test('the integration list uses the same two-step inline confirm', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedIntegration(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    const row = rowFor(authedPage, INTEGRATION.name);
    await expect(row).toBeVisible();
    // "Sync now" is the one trigger the calendar rows don't have; it must go with
    // the rest when the confirm takes over.
    await expect(row.getByRole('button', { name: `Sync "${INTEGRATION.name}" now` })).toBeVisible();

    await authedPage.getByRole('button', { name: INT_REMOVE(INTEGRATION.name) }).click();
    await expect(row.getByText('Remove?', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(authedPage.getByRole('dialog')).toHaveCount(0);
    await expect(row.getByRole('button', { name: `Sync "${INTEGRATION.name}" now` })).toHaveCount(
        0
    );

    await row.getByRole('button', { name: 'Cancel' }).click();
    await expect(row.getByRole('button', { name: `Sync "${INTEGRATION.name}" now` })).toBeVisible();

    await authedPage.getByRole('button', { name: INT_REMOVE(INTEGRATION.name) }).click();
    await row.getByRole('button', { name: 'Confirm' }).click();
    await expect(authedPage.getByText(INTEGRATION.name, { exact: true })).toHaveCount(0);
});

test('editing a calendar swaps the row for a form, and back again', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedCalendars(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    await expect(rowFor(authedPage, CAL.quiet.name)).toBeVisible();
    await authedPage.getByRole('button', { name: CAL_EDIT(CAL.quiet.name) }).click();

    // The row is replaced in place: its controls are gone and the inline form's
    // fields, seeded from the record, are there instead.
    await expect(authedPage.getByRole('button', { name: CAL_EDIT(CAL.quiet.name) })).toHaveCount(0);
    await expect(authedPage.getByRole('button', { name: CAL_REMOVE(CAL.quiet.name) })).toHaveCount(
        0
    );
    const urlField = authedPage.getByPlaceholder('https://…/calendar.ics', { exact: true });
    await expect(urlField).toBeVisible();
    await expect(urlField).toHaveValue(DEAD_ICS('quiet'));
    await expect(authedPage.getByPlaceholder('e.g. Google', { exact: true })).toHaveValue(
        CAL.quiet.provider
    );
    await expect(calendarsCard(authedPage).getByRole('button', { name: 'Save' })).toBeVisible();

    await calendarsCard(authedPage).getByRole('button', { name: 'Cancel' }).click();

    await expect(urlField).toHaveCount(0);
    await expect(authedPage.getByRole('button', { name: CAL_EDIT(CAL.quiet.name) })).toBeVisible();
    await expect(rowFor(authedPage, CAL.quiet.name)).toBeVisible();
});

test('editing an integration swaps the row for a form, and back again', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedIntegration(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    await expect(rowFor(authedPage, INTEGRATION.name)).toBeVisible();
    await authedPage.getByRole('button', { name: INT_EDIT(INTEGRATION.name) }).click();

    await expect(authedPage.getByRole('button', { name: INT_EDIT(INTEGRATION.name) })).toHaveCount(
        0
    );
    const orgField = authedPage.getByPlaceholder('e.g. contoso', { exact: true });
    await expect(orgField).toBeVisible();
    await expect(orgField).toHaveValue(INTEGRATION.organization);
    // The stored PAT is never echoed back — the edit form offers a blank
    // "leave to keep" field instead.
    const tokenField = authedPage.getByPlaceholder('••••••••', { exact: true });
    await expect(tokenField).toBeVisible();
    await expect(tokenField).toHaveValue('');
    await expect(trackersCard(authedPage).getByRole('button', { name: 'Save' })).toBeVisible();

    await trackersCard(authedPage).getByRole('button', { name: 'Cancel' }).click();

    await expect(orgField).toHaveCount(0);
    await expect(rowFor(authedPage, INTEGRATION.name)).toBeVisible();
});

test('a connection with a last_error renders the warning row', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await seedCalendars(api, account, goldenProfileId);
    await triggerIcsFetch(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, '/settings');

    const brokenRow = rowFor(authedPage, CAL.broken.name);
    await expect(brokenRow).toBeVisible();

    // `refresh_connection` records "fetch failed (<ExceptionName>)" — the exact
    // exception class is httpx's business, so only the stable prefix is pinned.
    const errorLine = brokenRow.getByText(/^fetch failed \(/);
    await expect(errorLine).toBeVisible();
    // Warning glyph + message on their own mono danger line beneath the name.
    const errorRow = errorLine.locator('xpath=..');
    await expect(errorRow).toHaveClass(
        'mt-1 flex items-center gap-1 font-mono text-[11px] text-danger'
    );
    await expect(errorRow.locator('svg.lucide-triangle-alert')).toBeVisible();

    // The disabled sibling was skipped by the fetch, so it has no warning row —
    // this is a per-connection state, not a list-wide banner.
    const quietRow = rowFor(authedPage, CAL.quiet.name);
    await expect(quietRow).toBeVisible();
    await expect(quietRow.locator('svg.lucide-triangle-alert')).toHaveCount(0);
});
