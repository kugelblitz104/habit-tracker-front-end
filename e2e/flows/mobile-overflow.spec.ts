import type { APIRequestContext, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { dayFrom } from '../fixtures/clock';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Guards the mobile layout against horizontal blowout: long task/project/
 * countdown/habit titles must truncate inside the content column, never widen
 * the page so the whole app scrolls sideways.
 *
 * The regression this was written for: the card's eject/collapse animation
 * wrappers are `display: grid` with no explicit columns, so the implicit `auto`
 * column track floors at the item's min-content width — which for a `truncate`
 * (nowrap) title is the entire title. The card overhung the column and the
 * document scrolled sideways at phone widths.
 *
 * Runs in the `narrow` project (390x844) via the `@narrow` tag. The long task
 * title comes from the golden dataset; a long-named countdown and habit are
 * seeded here because the fixture's are deliberately short, and the Countdowns
 * and Habits pages need a long title to be a real probe.
 */

const LONG_COUNTDOWN = 'Final walkthrough and mortgage closing appointment';
const LONG_HABIT = 'Take medication and log blood pressure reading';

/** The golden Alpha project's id — the project-detail sweep needs a real route. */
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

/**
 * Fails if the document is wider than the viewport, naming the widest elements
 * that stick out past the body so the culprit is obvious from the report.
 */
async function expectNoHorizontalOverflow(page: Page, label: string) {
    const report = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflowBy = doc.scrollWidth - doc.clientWidth;
        if (overflowBy <= 0) return { overflowBy, culprits: [] as string[] };
        const limit = document.body.getBoundingClientRect().right;
        const culprits = [...document.querySelectorAll<HTMLElement>('body *')]
            .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.right > limit + 1;
            })
            .slice(0, 8)
            .map((el) => {
                const r = el.getBoundingClientRect();
                const cls = el.className?.toString().slice(0, 80) ?? '';
                return `<${el.tagName.toLowerCase()} class="${cls}"> right=${Math.round(
                    r.right
                )} width=${Math.round(r.width)}`;
            });
        return { overflowBy, culprits };
    });
    expect(
        report.overflowBy,
        `${label} scrolls sideways by ${report.overflowBy}px. Offenders:\n${report.culprits.join(
            '\n'
        )}`
    ).toBeLessThanOrEqual(0);
}

test('long titles truncate instead of widening the page on mobile @narrow', async ({
    api,
    account,
    anchor,
    goldenProfileId,
    authedPage
}) => {
    const projectId = await alphaProjectId(api, account, goldenProfileId);

    const countdown = await api.post('/countdowns/', {
        headers: authHeaders(account),
        data: {
            profile_id: goldenProfileId,
            title: LONG_COUNTDOWN,
            // Via the anchor helper, so no local `toISOString()` date maths can
            // drift a day against the band/date logic.
            target_date: dayFrom(anchor, 30)
        }
    });
    expect(countdown.ok(), `countdown seed failed: ${countdown.status()}`).toBeTruthy();

    const habit = await api.post('/habits/', {
        headers: authHeaders(account),
        data: {
            profile_id: goldenProfileId,
            name: LONG_HABIT,
            question: 'Did you take your medication and log the reading today?',
            color: '#66ccaa',
            frequency: 1,
            range: 1,
            category: 'Morning'
        }
    });
    expect(habit.ok(), `habit seed failed: ${habit.status()}`).toBeTruthy();

    // Today, with the Now/Soon cards visible.
    await gotoAppRoute(authedPage, '/');
    const nowTitle = authedPage.getByRole('button', { name: GOLDEN.tasks.longTitle, exact: true });
    await expect(nowTitle).toBeVisible();
    await expectNoHorizontalOverflow(authedPage, 'Today');

    // The Now-band title is the one from the bug report: it must be clipped to
    // its column, not laid out at full text width.
    const clipped = await nowTitle.evaluate(
        (el) => el.scrollWidth > el.clientWidth && el.clientWidth <= el.parentElement!.clientWidth
    );
    expect(clipped, 'Now-band title should be ellipsis-clipped inside its column').toBeTruthy();

    // Whenever is collapsed by default — its band body is a second grid wrapper.
    await authedPage.getByRole('button', { name: /^Whenever \d+$/ }).click();
    await expect(
        authedPage.getByRole('button', { name: GOLDEN.tasks.whenever, exact: true })
    ).toBeVisible();
    await expectNoHorizontalOverflow(authedPage, 'Today (Whenever expanded)');

    // Closed disclosure — a third grid wrapper.
    await authedPage.getByRole('button', { name: /^Closed/ }).click();
    await expect(authedPage.getByText(GOLDEN.tasks.closed, { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(authedPage, 'Today (Closed expanded)');

    for (const [label, url] of [
        ['All tasks', '/tasks'],
        ['Projects', '/projects'],
        ['Project detail', `/projects/${projectId}`],
        ['Countdowns', '/countdown'],
        ['Habits', '/habits']
    ] as const) {
        await authedPage.goto(url);
        await authedPage.waitForLoadState('networkidle');
        await expectNoHorizontalOverflow(authedPage, label);
    }
});
