import { authHeaders } from '../fixtures/api';
import { GOLDEN, GOLDEN_TASK_SLUGS } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Readable task detail URLs: `/tasks/setup-utilities` rather than `/tasks/172`.
 *
 * Deep-links specifically — a cold navigation straight to the URL, with nothing
 * in the react-query cache. That is the case the feature exists for (a link you
 * saved or shared), and it is the one that exercises the slug lookup for real;
 * clicking through from a list, covered in detail-pane.spec.ts, arrives with the
 * task already fetched.
 *
 * Both URL forms are tested because both are permanently supported: a task whose
 * title yields no usable slug has none, and every pre-existing bookmark is
 * numeric.
 */

const heading = (title: string) => ({ name: title, exact: true }) as const;

test('a slug URL deep-links straight to the task', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, `/tasks/${GOLDEN_TASK_SLUGS.now}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.tasks.now))).toBeVisible();
    // The URL is left as it was typed — no redirect to the numeric form.
    await expect(authedPage).toHaveURL(`/tasks/${GOLDEN_TASK_SLUGS.now}`);
});

test('a numeric URL still deep-links to the task', async ({
    authedPage,
    api,
    account,
    goldenProfileId
}) => {
    const response = await api.get('/tasks/', {
        headers: authHeaders(account),
        params: { profile_id: goldenProfileId }
    });
    expect(response.ok(), `GET /tasks/ failed: ${response.status()}`).toBeTruthy();
    const { tasks } = await response.json();
    const task = tasks.find((t: { title: string }) => t.title === GOLDEN.tasks.now);
    expect(task, `${GOLDEN.tasks.now} missing from the golden import`).toBeTruthy();

    // Also pins that the API assigned the slug this spec's sibling test relies on.
    expect(task.slug).toBe(GOLDEN_TASK_SLUGS.now);

    await gotoAppRoute(authedPage, `/tasks/${task.id}`);

    await expect(authedPage.getByRole('heading', heading(GOLDEN.tasks.now))).toBeVisible();
});

test('an unrecognised slug reports not-found instead of an empty screen', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/tasks/no-such-task-exists');

    await expect(
        authedPage.getByText("That task link doesn't match a task in this profile.")
    ).toBeVisible();
});
