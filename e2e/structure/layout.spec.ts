import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { appHeader, expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * # Structure locks — BRITTLE BY DESIGN
 *
 * These tests read `className` off specific structural nodes and compare them to
 * literals committed below. That is the point: they are the closest thing to
 * visual protection this suite has without pixel baselines.
 *
 * **A failure here does not mean something is broken.** It means the rendered DOM
 * changed. The correct response is:
 *
 *   1. Look at the diff and decide whether the change was intended.
 *   2. If it was, update the literal in THIS FILE, in the SAME commit.
 *   3. If it wasn't, the refactor regressed the layout — fix the source.
 *
 * ## What this protects
 *
 * Two extractions are queued: a `PageShell` replacing five duplicated
 * "min-h-screen > AppHeader + centred container + pane row" call sites, and a
 * `DetailPane` replacing three duplicated sticky `<aside>` hosts. The contract
 * for both is that the rendered DOM is IDENTICAL afterwards, so every literal
 * here was read out of the current DOM rather than transcribed from source.
 *
 * ## The one intentional asymmetry
 *
 * The task pane and habit pane card surfaces are NOT the same, and must not be
 * unified by accident: the task pane uses `--surface-card-bg` /
 * `--surface-card-border`, the habit pane uses `--habit-container-bg` /
 * `--habit-container-border` and additionally carries `relative` (its close
 * button is absolutely positioned in the corner). They are asserted separately.
 *
 * ## Selectors
 *
 * Structural nodes are reached by POSITION from the app header, never by class —
 * otherwise the assertion would be circular. Classes only appear on the
 * right-hand side of expectations, where they are the subject under test.
 */

// --- page shell -------------------------------------------------------------

const WRAPPER = 'min-h-screen';

/** `mx-auto px-5 py-7 md:px-7` + PAGE_WIDTH_TRANSITION + the width token. */
const CONTAINER_CLOSED =
    'mx-auto px-5 py-7 md:px-7 transition-[max-width] duration-300 ease-out max-w-[1080px]';
const CONTAINER_OPEN =
    'mx-auto px-5 py-7 md:px-7 transition-[max-width] duration-300 ease-out max-w-[1440px]';

/** `paneRowClass(isWide: true, showPane, paneWidth)` — see `src/lib/layout.ts`. */
const PANE_ROW_CLOSED =
    'grid items-start transition-all duration-300 ease-out gap-x-0 grid-cols-[minmax(0,1fr)_0px]';
const PANE_ROW_OPEN_480 =
    'grid items-start transition-all duration-300 ease-out gap-x-6 grid-cols-[minmax(0,1fr)_480px]';
const PANE_ROW_OPEN_400 =
    'grid items-start transition-all duration-300 ease-out gap-x-6 grid-cols-[minmax(0,1fr)_400px]';

// --- detail pane ------------------------------------------------------------

const PANE_ASIDE =
    'pane-rise sticky top-7 max-h-[calc(100vh-3.5rem)] w-full min-w-0 overflow-x-hidden overflow-y-auto';
const PANE_INNER_480 = 'w-[480px]';
/** The countdown form pane fuses the width and the card surface into one node. */
const PANE_INNER_400_CARD = 'w-[400px] rounded-card border p-4';
const TASK_PANE_CARD = 'rounded-card border p-4';
const HABIT_PANE_CARD = 'relative rounded-card border p-4';

// --- shared surfaces --------------------------------------------------------

const SETTINGS_CARD = 'rounded-card border p-4 md:px-[22px] md:py-5';
const CHART_CARD = 'rounded-card border p-4';
const QUERY_STATE_ERROR_LINE = 'font-mono text-[12px] text-danger';

/**
 * The centred content container: the app header's next element sibling inside the
 * `min-h-screen` wrapper. Positional so the lookup can't beg the question.
 */
const container = (page: Page): Locator =>
    appHeader(page).locator('xpath=following-sibling::div[1]');

/** The master-detail row: the container's first child. */
const paneRow = (page: Page): Locator => container(page).locator('xpath=./div[1]');

/** The page wrapper: the app header's parent. */
const wrapper = (page: Page): Locator => appHeader(page).locator('xpath=..');

const expectClosedShell = async (page: Page) => {
    await expect(wrapper(page)).toHaveClass(WRAPPER);
    await expect(container(page)).toHaveClass(CONTAINER_CLOSED);
    await expect(paneRow(page)).toHaveClass(PANE_ROW_CLOSED);
};

const firstProjectId = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<number> => {
    const response = await api.get('/projects/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `list projects: ${response.status()}`).toBeTruthy();
    const { projects } = await response.json();
    const alpha = projects.find((p: { name: string }) => p.name === GOLDEN.projects.alpha);
    expect(alpha, `${GOLDEN.projects.alpha} should exist in the golden profile`).toBeTruthy();
    return alpha.id;
};

/**
 * Open a task's detail pane by clicking its title.
 *
 * The class assertions that follow read a settled DOM: `pane-rise` animates a
 * transform on mount, and `paneRowClass` transitions `grid-template-columns` for
 * 300ms — but neither touches the class ATTRIBUTE, which React sets in the same
 * commit as the pane appearing. Waiting for the aside is therefore enough.
 */
const openTaskPane = async (page: Page, title: string) => {
    await taskRowTitle(page, title).click();
    await expect(page.locator('aside')).toHaveCount(1);
};

test('the page shell is identical across all five surfaces, pane closed', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    const projectId = await firstProjectId(api, account, goldenProfileId);

    for (const path of ['/', '/tasks', '/habits', '/countdown', `/projects/${projectId}`]) {
        await gotoAppRoute(authedPage, path);
        // Nothing is open, so every surface must render the narrow width and the
        // zero-width pane track. One literal, five call sites — which is exactly
        // the duplication `PageShell` is meant to collapse.
        await expect(wrapper(authedPage), `${path} wrapper`).toHaveClass(WRAPPER);
        await expect(container(authedPage), `${path} container`).toHaveClass(CONTAINER_CLOSED);
        await expect(paneRow(authedPage), `${path} pane row`).toHaveClass(PANE_ROW_CLOSED);
        await expect(authedPage.locator('aside'), `${path} has no pane`).toHaveCount(0);
    }
});

test('the shell widens when the task pane opens on Today', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');
    await expectClosedShell(authedPage);

    await openTaskPane(authedPage, GOLDEN.tasks.now);

    await expect(container(authedPage)).toHaveClass(CONTAINER_OPEN);
    await expect(paneRow(authedPage)).toHaveClass(PANE_ROW_OPEN_480);
    // The header tracks the same width token so the whole page moves as one.
    await expect(appHeader(authedPage).locator('xpath=./div[1]')).toHaveClass(
        'mx-auto flex items-stretch justify-between gap-3 px-5 md:px-7 transition-[max-width] duration-300 ease-out max-w-[1440px]'
    );
});

test('the shell widens when the task pane opens on All tasks', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/tasks');
    await expectClosedShell(authedPage);

    await openTaskPane(authedPage, GOLDEN.tasks.now);

    await expect(container(authedPage)).toHaveClass(CONTAINER_OPEN);
    await expect(paneRow(authedPage)).toHaveClass(PANE_ROW_OPEN_480);
});

test('the shell widens when the task pane opens on a project', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    const projectId = await firstProjectId(api, account, goldenProfileId);
    await gotoAppRoute(authedPage, `/projects/${projectId}`);
    await expectClosedShell(authedPage);

    await openTaskPane(authedPage, GOLDEN.tasks.now);

    await expect(container(authedPage)).toHaveClass(CONTAINER_OPEN);
    await expect(paneRow(authedPage)).toHaveClass(PANE_ROW_OPEN_480);
});

test('the shell widens when the habit pane opens', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/habits');
    await expectClosedShell(authedPage);

    await authedPage
        .getByRole('link', { name: new RegExp(GOLDEN.habits.daily) })
        .first()
        .click();
    await expect(authedPage.locator('aside')).toHaveCount(1);

    await expect(container(authedPage)).toHaveClass(CONTAINER_OPEN);
    await expect(paneRow(authedPage)).toHaveClass(PANE_ROW_OPEN_480);
});

test('the countdown form pane opens a 400px track, not 480px', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/countdown');
    await expectClosedShell(authedPage);

    await authedPage.getByRole('button', { name: 'Edit countdown' }).first().click();
    await expect(authedPage.locator('aside')).toHaveCount(1);

    await expect(container(authedPage)).toHaveClass(CONTAINER_OPEN);
    // The only surface that passes a non-default `paneWidth` to `paneRowClass`.
    await expect(paneRow(authedPage)).toHaveClass(PANE_ROW_OPEN_400);
});

test('the task detail pane aside and its fixed-width card', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');
    await openTaskPane(authedPage, GOLDEN.tasks.now);

    const aside = authedPage.locator('aside');
    await expect(aside).toHaveClass(PANE_ASIDE);
    await expect(aside.locator('xpath=./div[1]')).toHaveClass(PANE_INNER_480);
    const card = aside.locator('xpath=./div[1]/div[1]');
    await expect(card).toHaveClass(TASK_PANE_CARD);
    // The task pane's surface tokens. Asserted as resolved colours because the
    // custom properties are applied inline via `style`, so the class string alone
    // says nothing about which surface this is.
    await expect(card).toHaveCSS(
        'background-color',
        await authedPage.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--surface-card-bg').trim()
        )
    );
});

test('the habit detail pane card is NOT the same surface as the task pane', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/habits');
    await authedPage
        .getByRole('link', { name: new RegExp(GOLDEN.habits.daily) })
        .first()
        .click();
    await expect(authedPage.locator('aside')).toHaveCount(1);

    const aside = authedPage.locator('aside');
    // The aside and the fixed-width inner ARE shared with the task pane...
    await expect(aside).toHaveClass(PANE_ASIDE);
    await expect(aside.locator('xpath=./div[1]')).toHaveClass(PANE_INNER_480);

    // ...but the card is not. `relative` is extra (the close button is absolutely
    // positioned in the corner) and the surface comes from the habit tokens. A
    // refactor that unified the two panes' cards has to fail here.
    const card = aside.locator('xpath=./div[1]/div[1]');
    await expect(card).toHaveClass(HABIT_PANE_CARD);
    expect(HABIT_PANE_CARD).not.toBe(TASK_PANE_CARD);

    const tokens = await authedPage.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return {
            habit: style.getPropertyValue('--habit-container-bg').trim(),
            card: style.getPropertyValue('--surface-card-bg').trim()
        };
    });
    expect(tokens.habit, '--habit-container-bg vs --surface-card-bg').not.toBe(tokens.card);
    await expect(card).toHaveCSS('background-color', tokens.habit);
});

test('the countdown form pane fuses its 400px width into the card node', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/countdown');
    await authedPage.getByRole('button', { name: 'Edit countdown' }).first().click();
    await expect(authedPage.locator('aside')).toHaveCount(1);

    const aside = authedPage.locator('aside');
    await expect(aside).toHaveClass(PANE_ASIDE);
    // Note the shape difference from the other two panes: no separate
    // fixed-width wrapper — this one node is both the width and the card.
    await expect(aside.locator('xpath=./div[1]')).toHaveClass(PANE_INNER_400_CARD);
    await expect(
        aside.getByRole('heading', { level: 2, name: 'Edit countdown', exact: true })
    ).toBeVisible();
});

test('the shared card surface, chart card and query-state line', async ({ authedPage }) => {
    // Card surface — one representative: a settings card. This is the only
    // variant that adds responsive padding on top of `rounded-card border p-4`.
    await gotoAppRoute(authedPage, '/settings');
    const connectionsCard = authedPage
        .locator('section')
        .filter({ hasText: 'Calendars — read-only' });
    await expect(connectionsCard).toHaveClass(SETTINGS_CARD);

    // Chart card — one representative: the Insights throughput chart. Same
    // surface as the task pane's card, deliberately.
    await gotoAppRoute(authedPage, '/insights');
    const chart = authedPage
        .locator('section')
        .filter({ has: authedPage.getByRole('heading', { level: 2, name: 'Tasks completed' }) });
    await expect(chart).toHaveClass(CHART_CARD);
    expect(CHART_CARD).toBe(TASK_PANE_CARD);

    // Query-state line — one representative: the page-level (12px) error tier.
    // Its per-surface copy and the 11px inline tier are covered exhaustively in
    // `flows/query-states.spec.ts`; this pins only the class string.
    await authedPage.route('**/tasks/?*', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    );
    await gotoAppRoute(authedPage, '/tasks');
    await expect(authedPage.getByText('Failed to load tasks.', { exact: true })).toHaveClass(
        QUERY_STATE_ERROR_LINE
    );
});

test('the All tasks list keeps its accessible structure', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/tasks');
    await expect(taskRowTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    // Complements the class literals above: this pins the DOM order and every
    // accessible name without coupling to styling at all, so a restructure that
    // preserves classes but reorders or renames controls still fails.
    //
    // Project link hrefs are asserted literally: they are slugs derived from the
    // project name, so unlike the ids they replaced they are identical on every
    // run and need no pattern.
    await expect(paneRow(authedPage).locator('xpath=./div[1]')).toMatchAriaSnapshot({
        name: 'all-tasks-list.aria.yml'
    });
});

test('the settings connection lists keep their accessible structure', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    // Seeded rather than taken from the golden dataset, which deliberately ships
    // both connection lists empty (see `flows/connections.spec.ts`).
    const calendar = await api.post('/calendar-connections/', {
        headers: authHeaders(account),
        data: {
            profile_id: goldenProfileId,
            name: 'Structure Calendar',
            color: '#6f9fe0',
            url: 'http://127.0.0.1:9/structure.ics',
            provider: 'Google',
            enabled: false
        }
    });
    expect(calendar.ok(), `seed calendar: ${calendar.status()}`).toBeTruthy();

    const integration = await api.post('/integrations/', {
        headers: authHeaders(account),
        data: {
            profile_id: goldenProfileId,
            provider: 'github',
            name: 'Structure GitHub',
            token: 'e2e-not-a-real-pat'
        }
    });
    expect(integration.ok(), `seed integration: ${integration.status()}`).toBeTruthy();

    await gotoAppRoute(authedPage, '/settings');

    const calendars = authedPage.locator('section').filter({ hasText: 'Calendars — read-only' });
    await expect(calendars.getByText('Structure Calendar', { exact: true })).toBeVisible();
    await expect(calendars).toMatchAriaSnapshot({ name: 'calendar-connections.aria.yml' });

    const trackers = authedPage
        .locator('section')
        .filter({ hasText: 'pull your open items in, publish tasks out' });
    await expect(trackers.getByText('Structure GitHub', { exact: true })).toBeVisible();
    await expect(trackers).toMatchAriaSnapshot({ name: 'integration-connections.aria.yml' });
});
