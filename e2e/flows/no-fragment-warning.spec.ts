import type { APIRequestContext } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, test } from '../fixtures/test';

/**
 * Walks every page (and the Closed disclosure) asserting React never logs
 * "Invalid prop `data-headlessui-state` supplied to `React.Fragment`".
 *
 * A Headless UI component that renders a Fragment (Disclosure, Menu, Popover,
 * Listbox…) clones its single child to attach state data attributes. When that
 * child is a `<>…</>` — the usual shape of a `{({ open }) => (<>…</>)}` render
 * prop on the OUTER component — those attributes land on a fragment and React
 * rejects them. Read the state off the inner Button/Panel instead.
 *
 * Deliberately narrow: it asserts on that one message rather than a clean
 * console, because the dev server also logs an unrelated, pre-existing hydration
 * mismatch from react-toastify's injected stylesheet. Do not broaden it.
 */

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

test('no Headless UI fragment-prop warnings across the app', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    const projectId = await alphaProjectId(api, account, goldenProfileId);

    // Collect on the Node side, and BEFORE the first navigation: page-side state
    // would reset on every navigation, leaving only the last document's warnings.
    // `authedPage` injects auth via addInitScript without navigating, so nothing
    // has been loaded yet at this point.
    const hits: string[] = [];
    let currentPage = 'start';
    authedPage.on('console', (msg) => {
        if (msg.text().includes('React.Fragment')) hits.push(`${currentPage}: ${msg.text()}`);
    });

    for (const url of [
        '/',
        '/tasks',
        '/projects',
        `/projects/${projectId}`,
        '/countdown',
        '/habits',
        '/timer',
        '/insights',
        '/settings'
    ]) {
        currentPage = url;
        await authedPage.goto(url);
        await authedPage.waitForLoadState('networkidle');
        await authedPage.waitForTimeout(400);
    }

    // Open + close the Closed disclosure on Today and on the project view.
    for (const url of ['/', `/projects/${projectId}`]) {
        currentPage = `${url} (Closed toggle)`;
        await authedPage.goto(url);
        await authedPage.waitForLoadState('networkidle');
        const btn = authedPage.getByRole('button', { name: /^Closed/ });
        if (await btn.count()) {
            await btn.first().click();
            await expect(authedPage.getByText(GOLDEN.tasks.closed, { exact: true })).toBeVisible();
            await btn.first().click();
            await authedPage.waitForTimeout(400);
        }
    }

    expect(hits, `React.Fragment prop warnings:\n${hits.slice(0, 5).join('\n')}`).toEqual([]);
});
