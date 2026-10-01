import { authHeaders } from '../fixtures/api';
import { expect, gotoAppRoute, test } from '../fixtures/test';
import { TaskStatus } from '@/types/types';

/**
 * Grouped by status, the Needs info section starts collapsed: those tasks are
 * waiting on someone else, so there is nothing to act on until they move.
 * Every other section renders open, as before.
 *
 * Seeds its own Needs info task rather than adding one to the golden profile,
 * whose task counts other specs assert exactly.
 */

const WAITING = 'GROUPPROBE waiting on a reply';

test('the Needs info section starts collapsed and opens on click', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    const seeded = await api.post('/tasks/', {
        headers: authHeaders(account),
        data: { profile_id: goldenProfileId, title: WAITING, status: TaskStatus.NEEDS_INFO }
    });
    expect(seeded.ok(), `seed task failed: ${seeded.status()} ${await seeded.text()}`).toBeTruthy();

    await gotoAppRoute(authedPage, '/tasks');
    await authedPage.getByRole('combobox', { name: /^group/i }).selectOption('status');

    const toggle = authedPage.getByRole('button', { name: /^needs info \d+$/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(authedPage.getByText(WAITING, { exact: true })).toHaveCount(0);

    // Only Needs info collapses: another status header is plain text, not a toggle.
    await expect(authedPage.getByRole('heading', { level: 2, name: /^open$/i })).toBeVisible();
    await expect(authedPage.getByRole('button', { name: /^open\b/i })).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(authedPage.getByText(WAITING, { exact: true })).toBeVisible();
});
