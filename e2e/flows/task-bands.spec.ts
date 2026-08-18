import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { dayFrom } from '../fixtures/clock';
import { TaskStatus } from '@/types/types';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * The ONE place date-driven task banding is asserted deliberately.
 *
 * Every other spec drives bands off `priority` (see `golden-profile.ts`) because
 * `compute_band` runs on the API container's clock — `date.today()`, UTC — and
 * the tasks router neither injects a `today` nor accepts a `tz`. A task banded
 * by a hard-coded date would therefore migrate Now -> Soon -> Whenever as real
 * time passed.
 *
 * Here the dates are computed AT RUN TIME from the `anchor` fixture instead, so
 * "today + 7" means today + 7 on whatever day the suite runs. `timezoneId` is
 * pinned to UTC in the Playwright config so the browser and the container agree
 * on which day that is.
 *
 * The rules under test (backend `constants.py::compute_band`, first match wins):
 *   1. status DONE / CANCELLED           -> hidden  (rendered in no band)
 *   2. status DEFERRED                   -> whenever (overrides everything below)
 *   3. effective date <= today, or priority == 3 -> now
 *   4. effective date <= today + 7, or priority == 2 -> soon
 *   5. otherwise                         -> whenever
 * where "effective date" is the EARLIER of due_date and scheduled_date.
 */

type Band = 'now' | 'soon' | 'whenever';

/** Band section headings on Today, in `BAND_META` order (band-section.tsx). */
const BAND_HEADING: Record<Band, string> = {
    now: 'Needs attention',
    soon: 'Soon',
    whenever: 'Whenever'
};

// Distinctive prefix so these never collide with a GOLDEN title, and so a
// leaked row is obvious in a failure message.
const P = 'BANDPROBE';

type TaskSeed = {
    title: string;
    priority?: number;
    status?: TaskStatus;
    /** Days from the anchor; omitted = no due date. */
    dueIn?: number;
    /** Days from the anchor. Only persisted on SCHEDULED tasks (see below). */
    scheduledIn?: number;
};

/**
 * Create a task through the API and return its server-computed band.
 *
 * `POST /tasks/` forces `scheduled_date`/`scheduled_time` to null unless the
 * status is SCHEDULED, so every seed that exercises the scheduled-date path has
 * to carry `status: SCHEDULED` — otherwise the field silently vanishes and the
 * test would be asserting the due-date path twice.
 */
const createTask = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    anchor: Date,
    seed: TaskSeed
): Promise<string> => {
    const response = await api.post('/tasks/', {
        headers: authHeaders(account),
        data: {
            profile_id: profileId,
            title: seed.title,
            priority: seed.priority ?? 0,
            status: seed.status ?? TaskStatus.OPEN,
            due_date: seed.dueIn === undefined ? null : dayFrom(anchor, seed.dueIn),
            scheduled_date:
                seed.scheduledIn === undefined ? null : dayFrom(anchor, seed.scheduledIn)
        }
    });
    expect(
        response.ok(),
        `create "${seed.title}" failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();
    const body = await response.json();
    if (seed.scheduledIn !== undefined) {
        // Guard the router's scheduled-data rule rather than trusting it: a
        // nulled scheduled_date would make the assertion below vacuous.
        expect(body.scheduled_date, `"${seed.title}" lost its scheduled_date`).toBe(
            dayFrom(anchor, seed.scheduledIn)
        );
    }
    return body.band;
};

/** The Today band `<section>` identified by its uppercase mono heading. */
const bandSection = (page: Page, band: Band) =>
    page.locator('section').filter({
        has: page.getByRole('heading', { level: 2, name: BAND_HEADING[band], exact: true })
    });

/**
 * Assert a task's title card lives in exactly one band section on Today (or in
 * none, for `null` — the hidden band).
 *
 * Counted rather than `toBeVisible()`-ed on purpose: Today collapses the
 * Whenever band to `grid-rows-[0fr]` by default, so its cards are in the DOM but
 * have zero height. Presence in the right section is the thing being asserted;
 * whether that section happens to be collapsed is a different test's business.
 */
/**
 * The row's fixed-width due column (line 1, immediately after the title). Its
 * wording is pinned exhaustively at the unit layer (`due-column.test.ts`);
 * this only guards the WIRING: that the row actually renders what
 * `formatDueColumn` returns for the task's real `due_date`, not a dropped
 * column or the wrong field.
 */
const dueColumnText = (page: Page, title: string): Locator =>
    taskRowTitle(page, title).locator('xpath=following-sibling::span[1]');

const expectBand = async (page: Page, title: string, band: Band | null) => {
    for (const candidate of ['now', 'soon', 'whenever'] as const) {
        await expect(
            taskRowTitle(bandSection(page, candidate), title),
            `"${title}" in the ${candidate} band`
        ).toHaveCount(candidate === band ? 1 : 0);
    }
};

test('closed tasks are hidden, and DEFERRED overrides urgency', async ({
    api,
    account,
    anchor,
    goldenProfileId,
    authedPage
}) => {
    const seeds: Array<[TaskSeed, Band | null]> = [
        // Rule 1 — DONE / CANCELLED win over an overdue date and top priority.
        [{ title: `${P} done overdue p3`, priority: 3, dueIn: -1, status: TaskStatus.DONE }, null],
        [
            {
                title: `${P} cancelled overdue p3`,
                priority: 3,
                dueIn: -1,
                status: TaskStatus.CANCELLED
            },
            null
        ],
        // Rule 2 — DEFERRED beats priority 3 AND an overdue date.
        [
            {
                title: `${P} deferred overdue p3`,
                priority: 3,
                dueIn: -1,
                status: TaskStatus.DEFERRED
            },
            'whenever'
        ]
    ];

    for (const [seed, expected] of seeds) {
        const band = await createTask(api, account, goldenProfileId, anchor, seed);
        expect(band, `API band for "${seed.title}"`).toBe(expected ?? 'hidden');
    }

    await gotoAppRoute(authedPage, '/');
    // Wait for the seeded rows to have rendered before counting absences,
    // otherwise every `toHaveCount(0)` passes against an empty list.
    await expect(
        taskRowTitle(bandSection(authedPage, 'whenever'), `${P} deferred overdue p3`)
    ).toHaveCount(1);

    for (const [seed, expected] of seeds) {
        await expectBand(authedPage, seed.title, expected);
    }
});

test('dates and priority band a task, and priority 3 / 2 short-circuit', async ({
    api,
    account,
    anchor,
    goldenProfileId,
    authedPage
}) => {
    const seeds: Array<[TaskSeed, Band]> = [
        // Rule 3 — due today or in the past.
        [{ title: `${P} due today`, dueIn: 0 }, 'now'],
        [{ title: `${P} due yesterday`, dueIn: -1 }, 'now'],
        // Rule 3 — priority 3 with a date far outside the Now window.
        [{ title: `${P} p3 due in 60`, priority: 3, dueIn: 60 }, 'now'],
        // Rule 4 — the 7-day window is inclusive at both ends...
        [{ title: `${P} due in 1`, dueIn: 1 }, 'soon'],
        [{ title: `${P} due in 7`, dueIn: 7 }, 'soon'],
        // ...and exclusive one day later, which is the boundary worth pinning.
        [{ title: `${P} due in 8`, dueIn: 8 }, 'whenever'],
        // Rule 4 — priority 2 with a date far outside the Soon window.
        [{ title: `${P} p2 due in 60`, priority: 2, dueIn: 60 }, 'soon'],
        // Priority 2 must NOT be able to pull a task out of Now.
        [{ title: `${P} p2 due yesterday`, priority: 2, dueIn: -1 }, 'now'],
        // Rule 5 — no date, and a priority that carries no urgency of its own.
        [{ title: `${P} p1 no dates`, priority: 1 }, 'whenever'],
        [{ title: `${P} p0 no dates`, priority: 0 }, 'whenever']
    ];

    for (const [seed, expected] of seeds) {
        const band = await createTask(api, account, goldenProfileId, anchor, seed);
        expect(band, `API band for "${seed.title}"`).toBe(expected);
    }

    await gotoAppRoute(authedPage, '/');
    await expect(taskRowTitle(bandSection(authedPage, 'now'), `${P} due today`)).toHaveCount(1);

    for (const [seed, expected] of seeds) {
        await expectBand(authedPage, seed.title, expected);
    }

    // Wiring check: the row's due column actually renders `formatDueColumn`'s
    // output for these two seeds' real due_date, derived from the same
    // run-time anchor rather than a hardcoded date. `due today` -> `dueIn: 0`,
    // not overdue, no due_time -> 'Today'. `due yesterday` -> `dueIn: -1`,
    // one whole day overdue -> '1d late'.
    await expect(dueColumnText(authedPage, `${P} due today`)).toHaveText('Today');
    await expect(dueColumnText(authedPage, `${P} due yesterday`)).toHaveText('1d late');
});

test('the EARLIER of due_date and scheduled_date decides the band', async ({
    api,
    account,
    anchor,
    goldenProfileId,
    authedPage
}) => {
    // Each pair is symmetric: whichever field holds the earlier date, the band
    // is the same. If `compute_band` took the LATER date (or only ever looked at
    // due_date) every one of these would land a band lower.
    const seeds: Array<[TaskSeed, Band]> = [
        [
            {
                title: `${P} scheduled yesterday, due in 60`,
                status: TaskStatus.SCHEDULED,
                scheduledIn: -1,
                dueIn: 60
            },
            'now'
        ],
        [
            {
                title: `${P} due yesterday, scheduled in 60`,
                status: TaskStatus.SCHEDULED,
                dueIn: -1,
                scheduledIn: 60
            },
            'now'
        ],
        [
            {
                title: `${P} scheduled in 3, due in 60`,
                status: TaskStatus.SCHEDULED,
                scheduledIn: 3,
                dueIn: 60
            },
            'soon'
        ],
        [
            {
                title: `${P} due in 3, scheduled in 60`,
                status: TaskStatus.SCHEDULED,
                dueIn: 3,
                scheduledIn: 60
            },
            'soon'
        ],
        // A scheduled date alone bands a task exactly as a due date would.
        [
            { title: `${P} scheduled today only`, status: TaskStatus.SCHEDULED, scheduledIn: 0 },
            'now'
        ],
        [
            { title: `${P} scheduled in 30 only`, status: TaskStatus.SCHEDULED, scheduledIn: 30 },
            'whenever'
        ]
    ];

    for (const [seed, expected] of seeds) {
        const band = await createTask(api, account, goldenProfileId, anchor, seed);
        expect(band, `API band for "${seed.title}"`).toBe(expected);
    }

    await gotoAppRoute(authedPage, '/');
    await expect(
        taskRowTitle(bandSection(authedPage, 'now'), `${P} scheduled yesterday, due in 60`)
    ).toHaveCount(1);

    for (const [seed, expected] of seeds) {
        await expectBand(authedPage, seed.title, expected);
    }
});
