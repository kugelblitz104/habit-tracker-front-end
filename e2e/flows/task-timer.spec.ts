import type { APIRequestContext, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * Locks "start a timer for this task" across the surfaces that each own a copy of
 * `handleStartTimer` (Today, All-tasks, the project view) plus the card context
 * menu that calls into them — the four call sites the upcoming `useStartTaskTimer`
 * hook collapses into one.
 *
 * Every variant has to: toast "Timer started", leave a RUNNING entry attached to
 * that task, and have the timer screen show it. The golden dataset deliberately
 * ships no running entry (its three time entries are all closed), so the one these
 * tests find is unambiguously the one they started. Each test stops its timer
 * again — the server allows only one running entry per profile.
 */

const projectIdByName = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    name: string
): Promise<number> => {
    const response = await api.get('/projects/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `GET /projects/ failed: ${response.status()}`).toBeTruthy();
    const { projects } = await response.json();
    const match = projects.find((p: { name: string }) => p.name === name);
    expect(match, `no project named ${name}`).toBeTruthy();
    return match.id as number;
};

const taskIdByTitle = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    title: string
): Promise<number> => {
    const response = await api.get('/tasks/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `GET /tasks/ failed: ${response.status()}`).toBeTruthy();
    const { tasks } = await response.json();
    const match = tasks.find((t: { title: string }) => t.title === title);
    expect(match, `no task titled ${title}`).toBeTruthy();
    return match.id as number;
};

/** Every running entry the profile has, straight from the API. */
const runningEntries = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<{ task_id: number | null; ended_at: string | null }[]> => {
    const response = await api.get('/time-entries/', {
        headers: authHeaders(account),
        params: { profile_id: profileId, running: true }
    });
    expect(response.ok(), `GET /time-entries/ failed: ${response.status()}`).toBeTruthy();
    return (await response.json()).time_entries;
};

const cardTitle = (page: Page, title: string) => taskRowTitle(page, title);

/**
 * The shared post-start assertions: the timer screen renders the running session,
 * the entry really is open-ended and attached to `taskId`, and stopping it from the
 * UI closes it out again.
 *
 * The task↔entry link is checked through the API rather than off the Recent entries
 * row, whose label resolution is racy — see the note at the bottom of this file.
 */
const expectRunningForTaskThenStop = async (
    page: Page,
    api: APIRequestContext,
    account: Account,
    profileId: number,
    taskId: number
) => {
    const started = await runningEntries(api, account, profileId);
    expect(started.length, 'exactly one running entry').toBe(1);
    expect(started[0]!.task_id).toBe(taskId);
    expect(started[0]!.ended_at ?? null).toBeNull();

    await gotoAppRoute(page, '/timer');
    await expect(page.getByText('Stopwatch running')).toBeVisible();

    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(page.getByText('Timer stopped')).toBeVisible();
    // Panel back to idle, and nothing left running for the next test.
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    expect(await runningEntries(api, account, profileId)).toEqual([]);
};

type Surface = { label: string; path: (projectId: number) => string };

const SURFACES: Surface[] = [
    { label: 'Today', path: () => '/' },
    { label: 'All tasks', path: () => '/tasks' },
    { label: 'Project view', path: (id) => `/projects/${id}` }
];

for (const surface of SURFACES) {
    test(`${surface.label}: starting a timer from a task card runs an entry for that task`, async ({
        api,
        account,
        goldenProfileId,
        authedPage
    }) => {
        const title = GOLDEN.tasks.now;
        const projectId = await projectIdByName(
            api,
            account,
            goldenProfileId,
            GOLDEN.projects.alpha
        );
        const taskId = await taskIdByTitle(api, account, goldenProfileId, title);

        await gotoAppRoute(authedPage, surface.path(projectId));
        const card = cardTitle(authedPage, title);
        await expect(card).toBeVisible();

        // The card's own timer affordance is the `s` shortcut on a focused card
        // (there is no visible button); the keydown handler lives on the card
        // container, so pressing it from the focused title button reaches it.
        await card.press('s');
        await expect(authedPage.getByText('Timer started')).toBeVisible();

        await expectRunningForTaskThenStop(authedPage, api, account, goldenProfileId, taskId);
    });
}

test('the task context menu starts a timer for that task', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    const title = GOLDEN.tasks.now;
    const taskId = await taskIdByTitle(api, account, goldenProfileId, title);

    await gotoAppRoute(authedPage, '/');
    const card = cardTitle(authedPage, title);
    await expect(card).toBeVisible();

    // Right-click anywhere on the card opens the app's own menu (the browser one is
    // suppressed); it is portalled to <body> with the task in its label.
    await card.click({ button: 'right' });
    const menu = authedPage.getByRole('menu', { name: `Task actions: ${title}` });
    await expect(menu).toBeVisible();

    await menu.getByRole('button', { name: 'Start timer', exact: true }).click();
    await expect(authedPage.getByText('Timer started')).toBeVisible();
    // The menu closes itself on the way out.
    await expect(menu).toHaveCount(0);

    await expectRunningForTaskThenStop(authedPage, api, account, goldenProfileId, taskId);
});

/*
 * Why the running entry is not asserted off the /timer "Recent entries" row:
 * `EditableTimeLog`'s `groups` memo depends on `[entries]` alone (its
 * exhaustive-deps warning is suppressed), while each row's title comes from
 * `contextNameFor` — which needs the tasks query. When the entries list resolves
 * FIRST, the groups are memoized with a null title and never recomputed once the
 * task names arrive, so the row falls back to showing its date. That made an
 * assertion on the row's task name flake on roughly one run in ten. Pre-existing,
 * unrelated to the timer-start extraction, and reported rather than worked around
 * in src/.
 */
