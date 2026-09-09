import { GOLDEN_TASK_SLUGS } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The task detail pane's record-keeping footer: Created / Updated / Closed as
 * relative labels with the full date and time on hover.
 *
 * Asserted by structure, never by the label text. Every label here is a
 * duration from the moment the test runs, and the golden fixture's stamps are
 * relative to the seed instant, so "26d ago" vs "Aug 10" (and "1d" vs "2d")
 * turns on the time of day the suite happens to start. The `datetime`
 * attribute is the part that has to be exact: it is the machine-readable
 * instant, and it is what proves the naive server value was read as UTC rather
 * than as local wall time.
 *
 * The arithmetic itself is pinned in src/lib/relative-time.test.ts, against a
 * fixed `now`.
 */

const footer = 'task-detail-timestamps';

test('an open task shows when it was created, and nothing it has not done yet', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, `/tasks/${GOLDEN_TASK_SLUGS.now}`);

    const stamps = authedPage.getByTestId(footer);
    await expect(stamps).toBeVisible();
    await expect(stamps).toContainText('Created');

    // The golden fixture never sets updated_date, and the task is open, so both
    // of the other two fields are absent rather than rendered empty.
    await expect(stamps).not.toContainText('Updated');
    await expect(stamps).not.toContainText('Closed');

    const created = stamps.locator('time');
    await expect(created).toHaveCount(1);

    // A designator is what makes this the instant the API meant. Without it the
    // browser would read the naive value as local wall time.
    expect(await created.getAttribute('datetime')).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
    );

    // The tooltip carries the full date and time the relative label hides.
    expect(await created.getAttribute('title')).toMatch(
        /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s?(AM|PM)$/
    );
});

test('a closed task shows when it was closed as well as when it was created', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, `/tasks/${GOLDEN_TASK_SLUGS.closed}`);

    const stamps = authedPage.getByTestId(footer);
    await expect(stamps).toBeVisible();
    await expect(stamps).toContainText('Created');
    await expect(stamps).toContainText('Closed');
    await expect(stamps.locator('time')).toHaveCount(2);
});
