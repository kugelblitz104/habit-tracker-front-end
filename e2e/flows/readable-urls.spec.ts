import type { APIRequestContext } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import {
    GOLDEN,
    GOLDEN_HABIT_SLUGS,
    GOLDEN_PROJECT_SLUGS,
    GOLDEN_TASK_SLUGS
} from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Readable detail URLs: `/tasks/setup-utilities` rather than `/tasks/172`, and
 * the same for projects and habits.
 *
 * Deep-links specifically: a cold navigation straight to the URL, with nothing
 * in the react-query cache. That is the case the feature exists for (a link you
 * saved or shared), and it is the one that exercises the slug lookup for real;
 * clicking through from a list, covered in detail-pane.spec.ts, arrives with the
 * row already fetched.
 *
 * Both URL forms are tested for each entity because both are permanently
 * supported: every bookmark made before slugs existed is numeric.
 */

const heading = (title: string) => ({ name: title, exact: true }) as const;

/**
 * One row of the golden profile, found by its display name, so a test can use
 * the real id the importer assigned without clicking through to it.
 */
const findRow = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    path: string,
    collection: string,
    nameField: 'title' | 'name',
    value: string
): Promise<{ id: number; slug: string }> => {
    const response = await api.get(path, {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `GET ${path} failed: ${response.status()}`).toBeTruthy();
    const rows = (await response.json())[collection];
    const row = rows.find((r: Record<string, string>) => r[nameField] === value);
    expect(row, `${value} missing from the golden import`).toBeTruthy();
    return row;
};

test('a slug URL deep-links straight to the task', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, `/tasks/${GOLDEN_TASK_SLUGS.now}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.tasks.now))).toBeVisible();
    // The URL is left as it was typed, with no redirect to the numeric form.
    await expect(authedPage).toHaveURL(`/tasks/${GOLDEN_TASK_SLUGS.now}`);
});

test('a numeric URL still deep-links to the task', async ({
    authedPage,
    api,
    account,
    goldenProfileId
}) => {
    const task = await findRow(
        api,
        account,
        goldenProfileId,
        '/tasks/',
        'tasks',
        'title',
        GOLDEN.tasks.now
    );
    // Also pins that the API assigned the slug the sibling test relies on.
    expect(task.slug).toBe(GOLDEN_TASK_SLUGS.now);

    await gotoAppRoute(authedPage, `/tasks/${task.id}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.tasks.now))).toBeVisible();
});

test('a slug URL deep-links straight to the project', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, `/projects/${GOLDEN_PROJECT_SLUGS.alpha}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.projects.alpha))).toBeVisible();
    await expect(authedPage).toHaveURL(`/projects/${GOLDEN_PROJECT_SLUGS.alpha}`);
});

test('a numeric URL still deep-links to the project', async ({
    authedPage,
    api,
    account,
    goldenProfileId
}) => {
    const project = await findRow(
        api,
        account,
        goldenProfileId,
        '/projects/',
        'projects',
        'name',
        GOLDEN.projects.alpha
    );
    expect(project.slug).toBe(GOLDEN_PROJECT_SLUGS.alpha);

    await gotoAppRoute(authedPage, `/projects/${project.id}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.projects.alpha))).toBeVisible();
});

test('a slug URL deep-links straight to the habit', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, `/habits/${GOLDEN_HABIT_SLUGS.daily}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.habits.daily))).toBeVisible();
    await expect(authedPage).toHaveURL(`/habits/${GOLDEN_HABIT_SLUGS.daily}`);
});

test('the old /details/:habitId path redirects to the habit URL', async ({
    authedPage,
    api,
    account,
    goldenProfileId
}) => {
    const habit = await findRow(
        api,
        account,
        goldenProfileId,
        '/habits/',
        'habits',
        'name',
        GOLDEN.habits.daily
    );
    expect(habit.slug).toBe(GOLDEN_HABIT_SLUGS.daily);

    // Habit detail moved off /details/ when habits gained slugs; old bookmarks
    // must still land on the habit rather than 404.
    await gotoAppRoute(authedPage, `/details/${habit.id}`);

    await expect(authedPage).toHaveURL(`/habits/${habit.id}`);
    await expect(authedPage.getByRole('heading', heading(GOLDEN.habits.daily))).toBeVisible();
});

test('an unrecognised slug reports not-found instead of an empty screen', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/tasks/no-such-task-exists');
    await expect(
        authedPage.getByText("That task link doesn't match a task in this profile.")
    ).toBeVisible();

    await gotoAppRoute(authedPage, '/projects/no-such-project-exists');
    await expect(
        authedPage.getByText("That project link doesn't match a project in this profile.")
    ).toBeVisible();

    await gotoAppRoute(authedPage, '/habits/no-such-habit-exists');
    await expect(
        authedPage.getByText("That habit link doesn't match a habit in this profile.")
    ).toBeVisible();
});
