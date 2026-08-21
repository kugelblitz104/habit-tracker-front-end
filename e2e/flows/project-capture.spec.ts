import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The projects page's quick-add capture bar (`CaptureBar`) and its inline
 * expanded form (`ProjectCaptureForm`): a plain Enter still creates a project
 * from the typed name alone plus a palette colour, while Shift+Enter (or the +
 * button) swaps the bar for the full field set. Escape in the form collapses it
 * without creating.
 */

const CAPTURE_LABEL = 'Add a project';

test('typing a name and pressing Enter creates the project and clears the field', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/projects');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Garage cleanup');
    await input.press('Enter');

    await expect(authedPage.getByText('Project created')).toBeVisible();
    await expect(authedPage.getByText('Garage cleanup', { exact: true })).toBeVisible();
    await expect(input).toHaveValue('');
});

test('Shift+Enter opens the inline form with the name pre-filled, and the bar is gone', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/projects');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Backyard fence');
    await input.press('Shift+Enter');

    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toHaveCount(0);
    await expect(authedPage.getByLabel('Project name')).toHaveValue('Backyard fence');
});

test('filling colour/notes in the form and clicking Add project creates it and collapses back to the bar', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/projects');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Kitchen remodel');
    await input.press('Shift+Enter');

    await authedPage.getByRole('textbox', { name: 'Color' }).fill('#3366cc');
    await authedPage.getByLabel('Notes').fill('Cabinets and countertops');
    await authedPage.getByRole('button', { name: 'Add project' }).click();

    await expect(authedPage.getByText('Project created', { exact: true })).toBeVisible();
    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toBeVisible();
    await expect(authedPage.getByLabel('Project name')).toHaveCount(0);
    await expect(authedPage.getByText('Kitchen remodel', { exact: true })).toBeVisible();
});

test('Escape in the form collapses it and creates nothing', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/projects');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Should not be created');
    await input.press('Shift+Enter');

    const nameField = authedPage.getByLabel('Project name');
    await expect(nameField).toHaveValue('Should not be created');
    await nameField.press('Escape');

    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toBeVisible();
    await expect(authedPage.getByText('Should not be created', { exact: true })).toHaveCount(0);
});
