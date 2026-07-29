import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The two bespoke destructive confirmations — `DeleteHabitModal` and
 * `DeleteProjectModal` — which no other spec clicks. Both are about to be
 * folded onto the shared `ConfirmModal`, so this pins what a user actually sees:
 * the warning copy, that Cancel is a genuine no-op, and that Confirm does the
 * one thing the copy promises.
 *
 * The project modal's copy is a behavioral contract, not decoration: it states
 * that tasks are KEPT and become unassigned, which is `Task.project_id`'s
 * `ON DELETE SET NULL` showing through. That claim is verified against the API
 * after the delete, not just read off the screen.
 *
 * Note both modals sit on `BaseModal`, whose Headless UI `Dialog` root carries
 * role=dialog but is `position: relative` with only `fixed` children — so it has
 * an empty box. Assert `toBeAttached()` on the dialog and `toBeVisible()` on
 * things inside it.
 */

const detailPane = (page: Page): Locator => page.getByRole('complementary');

/** A habit's row on the /habits dashboard. */
const habitRow = (page: Page, name: string): Locator =>
    page.getByRole('row').filter({ has: page.getByRole('link', { name }) });

/**
 * A habit row's name link. Not `exact`: the row `Label` appends the cadence, so
 * the accessible name reads "Daily habit daily".
 */
const habitRowLink = (page: Page, name: string): Locator => page.getByRole('link', { name });

const openDialog = (page: Page): Locator => page.getByRole('dialog');

/** Every project in the golden profile, straight from the API. */
const fetchProjects = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<{ id: number; name: string }[]> => {
    const response = await api.get('/projects/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `GET /projects/ failed: ${response.status()}`).toBeTruthy();
    return (await response.json()).projects;
};

const projectIdByName = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    name: string
): Promise<number> => {
    const match = (await fetchProjects(api, account, profileId)).find((p) => p.name === name);
    expect(match, `project "${name}" missing from the golden import`).toBeTruthy();
    return match!.id;
};

test('the habit delete confirm warns, cancels cleanly, and on confirm removes the habit', async ({
    api,
    account,
    authedPage,
    goldenProfileId
}) => {
    await gotoAppRoute(authedPage, '/habits');
    await expect(habitRow(authedPage, GOLDEN.habits.daily)).toHaveCount(1);

    await habitRowLink(authedPage, GOLDEN.habits.daily).click();
    const pane = detailPane(authedPage);
    await expect(
        pane.getByRole('heading', { name: GOLDEN.habits.daily, exact: true })
    ).toBeVisible();

    // The footer's destructive control, distinct from the confirm button's
    // "Delete habit" inside the modal.
    await pane.getByRole('button', { name: 'Delete', exact: true }).click();

    const dialog = openDialog(authedPage);
    await expect(dialog).toBeAttached();
    await expect(dialog.getByRole('heading', { name: 'Delete habit' })).toBeVisible();
    // The habit being deleted is named in the panel, so the confirm can't be
    // mistaken for a different row.
    await expect(dialog).toContainText(GOLDEN.habits.daily);
    await expect(dialog).toContainText(
        'This action is irreversible. All habit data including tracking history will be permanently deleted.'
    );
    // Pinned through the refactor: the copy offers archiving as the non-
    // destructive alternative, which is why the footer carries both controls.
    await expect(dialog).toContainText('consider archiving it instead');
    await expect(dialog).toContainText('preserve your habit data');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(openDialog(authedPage)).toHaveCount(0);

    // Cancel is a no-op: habit intact, pane still open on it.
    await expect(habitRow(authedPage, GOLDEN.habits.daily)).toHaveCount(1);
    await expect(
        pane.getByRole('heading', { name: GOLDEN.habits.daily, exact: true })
    ).toBeVisible();

    await pane.getByRole('button', { name: 'Delete', exact: true }).click();
    await openDialog(authedPage).getByRole('button', { name: 'Delete habit' }).click();

    // Gone from the dashboard, and the pane it was open in closes with it.
    await expect(habitRow(authedPage, GOLDEN.habits.daily)).toHaveCount(0);
    await expect(detailPane(authedPage)).toHaveCount(0);
    // The other two habits are untouched.
    await expect(habitRow(authedPage, GOLDEN.habits.thrice)).toHaveCount(1);
    await expect(habitRow(authedPage, GOLDEN.habits.paused)).toHaveCount(1);

    // Actually deleted server-side, not just dropped from the query cache. The
    // habit LIST lives under the user, not /habits/ (which is create/delete-all).
    const remaining = await api.get(`/users/${account.userId}/habits`, {
        headers: authHeaders(account),
        params: { profile_id: goldenProfileId, limit: 100 }
    });
    expect(remaining.ok(), `habit list fetch failed: ${remaining.status()}`).toBeTruthy();
    const names: string[] = (await remaining.json()).habits.map((h: { name: string }) => h.name);
    expect(names.sort()).toEqual([GOLDEN.habits.paused, GOLDEN.habits.thrice].sort());
});

test('the project delete confirm is reachable from the footer and from the editor, and Cancel keeps the project', async ({
    api,
    account,
    authedPage,
    goldenProfileId
}) => {
    const projectId = await projectIdByName(api, account, goldenProfileId, GOLDEN.projects.alpha);
    await gotoAppRoute(authedPage, `/projects/${projectId}`);

    const projectHeading = authedPage.getByRole('heading', {
        name: GOLDEN.projects.alpha,
        exact: true
    });
    await expect(projectHeading).toBeVisible();

    // --- entry point 1: the page's danger-zone Delete ---
    await authedPage.getByRole('button', { name: 'Delete', exact: true }).click();

    const dialog = openDialog(authedPage);
    await expect(dialog).toBeAttached();
    await expect(dialog.getByRole('heading', { name: 'Delete project' })).toBeVisible();
    await expect(dialog).toContainText(GOLDEN.projects.alpha);
    await expect(dialog).toContainText(
        'This action is irreversible. The project and its notes will be permanently deleted.'
    );
    // The behavioral contract: ON DELETE SET NULL on Task.project_id.
    await expect(dialog).toContainText(
        'Tasks in this project are kept — they simply become unassigned (no project).'
    );
    await expect(dialog).toContainText('consider archiving it instead');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(openDialog(authedPage)).toHaveCount(0);
    await expect(projectHeading).toBeVisible();
    await expect(authedPage).toHaveURL(new RegExp(`/projects/${projectId}$`));

    // --- entry point 2: the editor's in-form Delete ---
    // The editor REPLACES the read view, yet the modal is mounted outside that
    // swap — so it has to open with the editor still on screen.
    await authedPage.getByRole('button', { name: 'Edit project' }).click();
    const editorHeading = authedPage.getByRole('heading', { name: 'Edit project' });
    await expect(editorHeading).toBeVisible();
    await expect(projectHeading).toHaveCount(0);

    await authedPage.getByRole('button', { name: 'Delete project' }).click();
    await expect(
        openDialog(authedPage).getByRole('heading', { name: 'Delete project' })
    ).toBeVisible();
    // Still the editor underneath, proving the modal lives outside the swap.
    // A tag selector rather than `getByRole` on purpose: Headless UI marks the
    // page behind an open Dialog inert, which drops it out of the a11y tree.
    await expect(authedPage.locator('h2', { hasText: 'Edit project' })).toBeVisible();

    await openDialog(authedPage).getByRole('button', { name: 'Cancel' }).click();
    await expect(openDialog(authedPage)).toHaveCount(0);
    // Still editing, still not deleted.
    await expect(editorHeading).toBeVisible();
    await expect(authedPage).toHaveURL(new RegExp(`/projects/${projectId}$`));
    const survivors = (await fetchProjects(api, account, goldenProfileId)).map((p) => p.name);
    expect(survivors.sort()).toEqual([GOLDEN.projects.alpha, GOLDEN.projects.beta].sort());
});

test('confirming the project delete removes it and leaves its tasks unassigned', async ({
    api,
    account,
    authedPage,
    goldenProfileId
}) => {
    const projectId = await projectIdByName(api, account, goldenProfileId, GOLDEN.projects.alpha);

    const tasksResponse = await api.get('/tasks/', {
        headers: authHeaders(account),
        params: { profile_id: goldenProfileId, project_id: projectId, limit: 100 }
    });
    expect(tasksResponse.ok(), `GET /tasks/ failed: ${tasksResponse.status()}`).toBeTruthy();
    const seededTask = (
        (await tasksResponse.json()).tasks as { id: number; title: string; project_id: number }[]
    ).find((t) => t.title === GOLDEN.tasks.now);
    expect(seededTask, `${GOLDEN.tasks.now} is not in ${GOLDEN.projects.alpha}`).toBeTruthy();
    expect(seededTask!.project_id).toBe(projectId);

    await gotoAppRoute(authedPage, `/projects/${projectId}`);
    await expect(
        authedPage.getByRole('heading', { name: GOLDEN.projects.alpha, exact: true })
    ).toBeVisible();

    await authedPage.getByRole('button', { name: 'Delete', exact: true }).click();
    await openDialog(authedPage).getByRole('button', { name: 'Delete project' }).click();

    // Deleting bounces back to the project list, without the deleted project.
    await expect(authedPage).toHaveURL(/\/projects$/);
    await expect(authedPage.getByText(GOLDEN.projects.beta, { exact: true })).toBeVisible();
    await expect(authedPage.getByText(GOLDEN.projects.alpha, { exact: true })).toHaveCount(0);

    // The copy's promise, checked at the source: the task is still there, just
    // detached from any project.
    const reread = await api.get(`/tasks/${seededTask!.id}`, { headers: authHeaders(account) });
    expect(reread.ok(), `GET /tasks/${seededTask!.id} failed: ${reread.status()}`).toBeTruthy();
    const task = await reread.json();
    expect(task.title).toBe(GOLDEN.tasks.now);
    expect(task.project_id).toBeNull();

    // And it still shows up in the UI, now with no project tag.
    await gotoAppRoute(authedPage, '/tasks');
    const taskTitle = authedPage.getByRole('button', { name: GOLDEN.tasks.now, exact: true });
    await expect(taskTitle).toBeVisible();
    await expect(authedPage.getByText(GOLDEN.projects.alpha, { exact: true })).toHaveCount(0);
});
