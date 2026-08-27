import type { Locator, Page } from '@playwright/test';

import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * Linking a task to an external work item with NO Azure DevOps or GitHub
 * connection configured.
 *
 * The golden profile ships `integration_connections: []`, which is exactly the
 * state these cover. The API has always accepted the
 * source/external_ref/external_url triple through a plain task update, but the
 * UI hid the whole affordance behind `connections.length === 0` and offered one
 * "connect in Settings" sentence instead, so both tests here fail against the
 * version before 2026-08-10.
 *
 * The chip's neutral colouring for a provider-less link is unit-tested in
 * `src/lib/external-link.test.ts` rather than asserted here: comparing resolved
 * CSS custom properties through the browser pins the token plumbing, not the
 * behaviour.
 */

const detailPane = (page: Page): Locator => page.getByRole('complementary');

const REF_PLACEHOLDER = 'Reference, e.g. AB#2841 or owner/repo#42';
const URL_PLACEHOLDER = /link to the work item/;
/** A tracker that is neither of the two providers, i.e. the soft-link case. */
const JIRA_URL = 'https://example.atlassian.net/browse/PROJ-412';
/** The edit target, and a host `sourceFromUrl` does recognise. */
const GITHUB_URL = 'https://github.com/octocat/hello/issues/42';

/** Open the Now-band task's detail pane from Today. */
const openTaskPane = async (page: Page): Promise<Locator> => {
    await gotoAppRoute(page, '/');
    await taskRowTitle(page, GOLDEN.tasks.now).click();
    const pane = detailPane(page);
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();
    return pane;
};

/** Link the task through the UI - the flow the first test in this file covers. */
const linkVia = async (pane: Locator, ref: string, url: string): Promise<void> => {
    await pane.getByRole('button', { name: 'Link existing' }).click();
    await pane.getByPlaceholder(REF_PLACEHOLDER).fill(ref);
    await pane.getByPlaceholder(URL_PLACEHOLDER).fill(url);
    await pane.getByRole('button', { name: 'Link', exact: true }).click();
    await expect(pane.getByRole('button', { name: 'Unlink' })).toBeVisible();
};

test('a task links to a third-party item with no connection configured', async ({ authedPage }) => {
    const pane = await openTaskPane(authedPage);

    await expect(pane.getByRole('heading', { name: 'Link', exact: true })).toBeVisible();
    // Publishing is the one thing a connection buys, so with none configured
    // there is nothing to publish to.
    await expect(pane.getByRole('button', { name: /^Publish to/ })).toHaveCount(0);

    await pane.getByRole('button', { name: 'Link existing' }).click();
    await pane.getByPlaceholder(REF_PLACEHOLDER).fill('PROJ-412');
    await pane.getByPlaceholder(URL_PLACEHOLDER).fill(JIRA_URL);
    await pane.getByRole('button', { name: 'Link', exact: true }).click();

    const link = pane.getByRole('link', { name: /PROJ-412/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', JIRA_URL);
    await expect(pane.getByRole('button', { name: 'Unlink' })).toBeVisible();
});

test('a URL with no scheme is caught on the field, not sent', async ({ authedPage }) => {
    const pane = await openTaskPane(authedPage);

    await pane.getByRole('button', { name: 'Link existing' }).click();
    await pane.getByPlaceholder(REF_PLACEHOLDER).fill('PROJ-412');
    await pane.getByPlaceholder(URL_PLACEHOLDER).fill('example.atlassian.net/browse/PROJ-412');
    await pane.getByRole('button', { name: 'Link', exact: true }).click();

    await expect(
        pane.getByText('Enter a full URL starting with http:// or https://')
    ).toBeVisible();
    // Nothing was written, so the form is still open and the task still unlinked.
    await expect(pane.getByRole('button', { name: 'Unlink' })).toHaveCount(0);
    await expect(pane.getByPlaceholder(URL_PLACEHOLDER)).toHaveAttribute('aria-invalid', 'true');
});

test('an existing link is edited in place', async ({ authedPage }) => {
    const pane = await openTaskPane(authedPage);
    await linkVia(pane, 'PROJ-412', JIRA_URL);

    const edit = pane.getByRole('button', { name: 'Edit link' });
    // The linked row is invisible to target-size.spec.ts, which sweeps every
    // route but never links a task, so this is the only place its controls are
    // measured against the 24px AA floor.
    await expect(edit).toBeVisible();
    const box = await edit.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(24);
    expect(box!.height).toBeGreaterThanOrEqual(24);

    await edit.click();
    const refField = pane.getByRole('textbox', { name: 'Reference' });
    const urlField = pane.getByRole('textbox', { name: 'Link URL' });
    await expect(refField).toHaveValue('PROJ-412');
    await expect(urlField).toHaveValue(JIRA_URL);

    // Both fields are required: a half-link renders the task as unlinked, so
    // saving one would read as the link having vanished.
    await refField.fill('');
    await expect(pane.getByRole('button', { name: 'Save link' })).toBeDisabled();

    await refField.fill('PROJ-999');
    await urlField.fill(GITHUB_URL);
    await pane.getByRole('button', { name: 'Save link' }).click();

    const link = pane.getByRole('link', { name: /PROJ-999/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', GITHUB_URL);
    await expect(pane.getByRole('link', { name: /PROJ-412/ })).toHaveCount(0);
});

test('the URL guard applies to an edit too, and nothing is written', async ({ authedPage }) => {
    const pane = await openTaskPane(authedPage);
    await linkVia(pane, 'PROJ-412', JIRA_URL);

    await pane.getByRole('button', { name: 'Edit link' }).click();
    await pane
        .getByRole('textbox', { name: 'Link URL' })
        .fill('example.atlassian.net/browse/PROJ-9');
    await pane.getByRole('button', { name: 'Save link' }).click();

    await expect(
        pane.getByText('Enter a full URL starting with http:// or https://')
    ).toBeVisible();
    await expect(pane.getByRole('textbox', { name: 'Link URL' })).toHaveAttribute(
        'aria-invalid',
        'true'
    );

    // The field error and aria-invalid can only come from the client-side guard -
    // an API rejection would surface as a toast instead - so no request was ever
    // sent, and the stored link is untouched.
    await expect(authedPage.getByText('Failed to update link')).toHaveCount(0);
    await pane.getByRole('button', { name: 'Cancel' }).click();
    await expect(pane.getByRole('link', { name: /PROJ-412/ })).toHaveAttribute('href', JIRA_URL);
});
