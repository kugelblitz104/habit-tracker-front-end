import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The habits dashboard's quick-add capture bar (`CaptureBar`) and its inline
 * expanded form (`HabitCaptureForm`): a plain Enter still creates a daily habit
 * from the typed name alone, while Shift+Enter (or the + button) swaps the bar
 * for the full field set. Escape in the form collapses it without creating.
 */

const CAPTURE_LABEL = 'Add a habit';

test('typing a name and pressing Enter creates the habit and clears the field', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/habits');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Read before bed');
    await input.press('Enter');

    await expect(authedPage.getByText('Habit created')).toBeVisible();
    await expect(authedPage.getByText('Read before bed', { exact: true })).toBeVisible();
    await expect(input).toHaveValue('');
});

test('Shift+Enter opens the inline form with the name pre-filled, and the bar is gone', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/habits');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Stretch every morning');
    await input.press('Shift+Enter');

    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toHaveCount(0);
    await expect(authedPage.getByLabel('Habit name')).toHaveValue('Stretch every morning');
});

test('filling colour/frequency/notes in the form and clicking Add habit creates it and collapses back to the bar', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/habits');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Weekly review');
    await input.press('Shift+Enter');

    await authedPage.getByRole('textbox', { name: 'Color' }).fill('#336699');
    await authedPage.getByRole('radio', { name: 'weekly' }).click();
    await authedPage.getByLabel('Notes').fill('Sunday evening wrap-up');
    await authedPage.getByRole('button', { name: 'Add habit' }).click();

    await expect(authedPage.getByText('Habit created')).toBeVisible();
    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toBeVisible();
    await expect(authedPage.getByLabel('Habit name')).toHaveCount(0);
    await expect(authedPage.getByText('Weekly review', { exact: true })).toBeVisible();
});

test('Escape in the form collapses it and creates nothing', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/habits');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Should not be created');
    await input.press('Shift+Enter');

    const nameField = authedPage.getByLabel('Habit name');
    await expect(nameField).toHaveValue('Should not be created');
    await nameField.press('Escape');

    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toBeVisible();
    await expect(authedPage.getByText('Should not be created', { exact: true })).toHaveCount(0);
});
