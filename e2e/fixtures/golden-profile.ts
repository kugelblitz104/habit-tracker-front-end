import { dayFrom, stampFrom } from './clock';
import { TaskStatus, TimeEntryKind, TrackerStatus } from '@/types/types';

/**
 * The golden dataset every spec renders against — one `ProfileBackup` document,
 * imported in a single `POST /backup/profiles` call.
 *
 * ## Why this is a builder rather than a committed .json
 *
 * Dates have to be relative to the test's anchor instant (see `clock.ts`): the
 * backend computes habit KPIs and task bands on its own clock, so absolute dates
 * baked into a file would age into meaninglessness — a seeded streak would read
 * as broken a week later. The document this returns *is* the backup JSON; only
 * its dates are resolved at seed time.
 *
 * ## Why bands come from priority, not due dates
 *
 * `compute_band` returns NOW for `priority == 3` and SOON for `priority == 2`
 * regardless of any date, and only falls back to date comparisons otherwise. The
 * tasks router never injects `today` and takes no `tz`, so a date-driven task
 * silently migrates Now -> Soon -> Whenever as real time passes. Driving bands off
 * priority makes band membership stable indefinitely. The date-driven path is
 * asserted deliberately, with run-time dates, in `flows/task-bands.spec.ts`.
 *
 * Source ids below are arbitrary — the importer remaps every foreign key
 * (`project_id`, `parent_id`, `task_id`, `habit_id`) onto the rows it creates.
 */

export const GOLDEN_PROFILE_NAME = 'E2E Golden';

/** Stable titles/names, exported so specs never duplicate a string literal. */
export const GOLDEN = {
    projects: { alpha: 'Alpha Project', beta: 'Beta Project' },
    tasks: {
        now: 'Now band task',
        soon: 'Soon band task',
        whenever: 'Whenever band task',
        deferred: 'Deferred task',
        closed: 'Closed task',
        parent: 'Parent with subtasks',
        subtaskOpen: 'Subtask still open',
        subtaskDone: 'Subtask already done',
        unassigned: 'Task with no project',
        estimated: 'Task with an estimate',
        longTitle:
            'A deliberately very long task title that has to ellipsis-clip rather than widen its row on a narrow viewport'
    },
    habits: { daily: 'Daily habit', thrice: 'Thrice weekly habit', paused: 'Lapsed habit' },
    countdowns: {
        future: 'Far future countdown',
        overdue: 'Overdue countdown',
        yearly: 'Yearly countdown',
        linked: 'Countdown linked to a task'
    }
} as const;

/**
 * The slug the API derives from a golden title: the readable half of a task
 * detail URL, `/tasks/now-band-task`.
 *
 * This mirrors the backend's `core/slugs.slugify` for the easy case ONLY: the
 * golden titles are plain ASCII and all distinct, so there is no ASCII folding
 * to reproduce and no numbered suffix to predict. The real rules (accent
 * folding, length trimming, `-2` suffixes, all-digit titles) are pinned in the
 * backend's tests/test_slugs.py. Don't grow this into a second implementation.
 */
const toSlug = (title: string) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export const GOLDEN_TASK_SLUGS = {
    now: toSlug(GOLDEN.tasks.now)
} as const;

export const GOLDEN_PROJECT_SLUGS = {
    alpha: toSlug(GOLDEN.projects.alpha)
} as const;

export const GOLDEN_HABIT_SLUGS = {
    daily: toSlug(GOLDEN.habits.daily)
} as const;

const IDS = {
    projectAlpha: 1,
    projectBeta: 2,
    taskNow: 10,
    taskSoon: 11,
    taskWhenever: 12,
    taskDeferred: 13,
    taskClosed: 14,
    taskParent: 15,
    taskSubtaskOpen: 16,
    taskSubtaskDone: 17,
    taskUnassigned: 18,
    taskEstimated: 19,
    taskLong: 20,
    habitDaily: 30,
    habitThrice: 31,
    habitPaused: 32
} as const;

/**
 * Build the backup document for a given anchor instant.
 *
 * Returned as `unknown`-friendly plain JSON rather than a typed model: the
 * generated client's `ProfileBackup` type is a *response* shape and the import
 * endpoint is posted to directly with `APIRequestContext`, so there is no
 * generated request type to satisfy here.
 */
export const buildGoldenProfile = (anchor: Date) => {
    const day = (n: number) => dayFrom(anchor, n);
    const stamp = (n: number, time?: string) => stampFrom(anchor, n, time);

    return {
        format: 'habit-tracker-profile-backup',
        version: 1,
        exported_at: stamp(0, '12:00:00'),

        // Every flag pinned rather than inherited, so which surfaces exist is
        // never a function of backend defaults. `insights_enabled` and
        // `countdowns_enabled` in particular gate whole routes.
        profile: {
            name: GOLDEN_PROFILE_NAME,
            color_start: '#3366cc',
            color_end: '#cc3366',
            habits_enabled: true,
            countdowns_enabled: true,
            insights_enabled: true,
            calendar_enabled: true,
            publish_to_azure: false,
            default_landing: 'today',
            week_start_monday: true,
            use_habit_color_accent: true,
            show_estimated_effort: true,
            pomodoro_work_minutes: 25,
            pomodoro_break_minutes: 5,
            pomodoro_long_break_minutes: 15,
            pomodoro_cycles: 4
        },

        projects: [
            {
                id: IDS.projectAlpha,
                name: GOLDEN.projects.alpha,
                color: '#3366cc',
                archived: false,
                created_date: stamp(-40)
            },
            {
                id: IDS.projectBeta,
                name: GOLDEN.projects.beta,
                color: '#cc8833',
                archived: false,
                created_date: stamp(-39)
            }
        ],

        tasks: [
            // --- one per band, driven by priority so the band never drifts ---
            {
                id: IDS.taskNow,
                project_id: IDS.projectAlpha,
                title: GOLDEN.tasks.now,
                priority: 3,
                status: TaskStatus.OPEN,
                created_date: stamp(-30),
                sort_order: 0
            },
            {
                id: IDS.taskSoon,
                project_id: IDS.projectAlpha,
                title: GOLDEN.tasks.soon,
                priority: 2,
                status: TaskStatus.OPEN,
                created_date: stamp(-29),
                sort_order: 1
            },
            {
                id: IDS.taskWhenever,
                project_id: IDS.projectAlpha,
                title: GOLDEN.tasks.whenever,
                priority: 0,
                status: TaskStatus.OPEN,
                created_date: stamp(-28),
                sort_order: 2
            },
            {
                // DEFERRED short-circuits to WHENEVER regardless of priority.
                id: IDS.taskDeferred,
                project_id: IDS.projectBeta,
                title: GOLDEN.tasks.deferred,
                priority: 3,
                status: TaskStatus.DEFERRED,
                created_date: stamp(-27),
                sort_order: 3
            },

            // --- closed, for the Closed disclosure and the completed-date filter ---
            {
                id: IDS.taskClosed,
                project_id: IDS.projectAlpha,
                title: GOLDEN.tasks.closed,
                priority: 1,
                status: TaskStatus.DONE,
                closed_date: stamp(-2, '14:30:00'),
                created_date: stamp(-26),
                sort_order: 4
            },

            // --- parent + subtasks, for SubtaskSection ---
            {
                id: IDS.taskParent,
                project_id: IDS.projectBeta,
                title: GOLDEN.tasks.parent,
                priority: 2,
                status: TaskStatus.IN_PROGRESS,
                created_date: stamp(-25),
                sort_order: 5
            },
            {
                id: IDS.taskSubtaskOpen,
                parent_id: IDS.taskParent,
                project_id: IDS.projectBeta,
                title: GOLDEN.tasks.subtaskOpen,
                status: TaskStatus.OPEN,
                created_date: stamp(-24),
                sort_order: 0
            },
            {
                id: IDS.taskSubtaskDone,
                parent_id: IDS.taskParent,
                project_id: IDS.projectBeta,
                title: GOLDEN.tasks.subtaskDone,
                status: TaskStatus.DONE,
                closed_date: stamp(-3, '11:00:00'),
                created_date: stamp(-23),
                sort_order: 1
            },

            // --- the odd ones out ---
            {
                id: IDS.taskUnassigned,
                title: GOLDEN.tasks.unassigned,
                priority: 0,
                status: TaskStatus.OPEN,
                created_date: stamp(-22),
                sort_order: 6
            },
            {
                id: IDS.taskEstimated,
                project_id: IDS.projectAlpha,
                title: GOLDEN.tasks.estimated,
                priority: 0,
                status: TaskStatus.OPEN,
                estimated_effort: 90,
                created_date: stamp(-21),
                sort_order: 7
            },
            {
                id: IDS.taskLong,
                project_id: IDS.projectAlpha,
                title: GOLDEN.tasks.longTitle,
                priority: 3,
                status: TaskStatus.OPEN,
                created_date: stamp(-20),
                sort_order: 8
            }
        ],

        countdowns: [
            {
                id: 40,
                title: GOLDEN.countdowns.future,
                target_date: day(120),
                color: '#3366cc',
                repeat: 'none',
                show_occurrence: false,
                created_date: stamp(-15)
            },
            {
                id: 41,
                title: GOLDEN.countdowns.overdue,
                target_date: day(-9),
                color: '#cc3333',
                repeat: 'none',
                show_occurrence: false,
                created_date: stamp(-15)
            },
            {
                // Anchored well in the past so the recurrence rule has to roll it
                // forward — which is what keeps a repeating countdown out of the
                // overdue group.
                id: 42,
                title: GOLDEN.countdowns.yearly,
                target_date: day(-400),
                color: '#33cc88',
                repeat: 'yearly',
                show_occurrence: true,
                created_date: stamp(-15)
            },
            {
                id: 43,
                task_id: IDS.taskNow,
                title: GOLDEN.countdowns.linked,
                target_date: day(30),
                color: '#8833cc',
                repeat: 'none',
                show_occurrence: false,
                created_date: stamp(-15)
            }
        ],

        // Durations are round numbers so the time-log summaries and the Insights
        // totals are assertable: 1h + 30m on Alpha, 45m on Beta = 2h 15m overall.
        time_entries: [
            {
                id: 50,
                task_id: IDS.taskNow,
                project_id: IDS.projectAlpha,
                kind: TimeEntryKind.STOPWATCH,
                label: 'Focus block',
                started_at: stamp(-1, '09:00:00'),
                ended_at: stamp(-1, '10:00:00'),
                duration_seconds: 3600,
                created_date: stamp(-1, '10:00:00')
            },
            {
                id: 51,
                task_id: IDS.taskSoon,
                project_id: IDS.projectAlpha,
                kind: TimeEntryKind.POMODORO,
                label: 'Pomodoro',
                started_at: stamp(-1, '11:00:00'),
                ended_at: stamp(-1, '11:30:00'),
                duration_seconds: 1800,
                created_date: stamp(-1, '11:30:00')
            },
            {
                id: 52,
                task_id: IDS.taskParent,
                project_id: IDS.projectBeta,
                kind: TimeEntryKind.STOPWATCH,
                label: 'Review',
                started_at: stamp(-2, '15:00:00'),
                ended_at: stamp(-2, '15:45:00'),
                duration_seconds: 2700,
                created_date: stamp(-2, '15:45:00')
            }
        ],

        habits: [
            {
                id: IDS.habitDaily,
                name: GOLDEN.habits.daily,
                question: 'Did you do the daily habit?',
                category: 'Health',
                color: '#33cc88',
                frequency: 1,
                range: 1,
                reminder: false,
                archived: false,
                sort_order: 0,
                created_date: stamp(-60)
            },
            {
                // Non-daily, so the completion-rate denominators differ from the
                // daily habit's.
                id: IDS.habitThrice,
                name: GOLDEN.habits.thrice,
                question: 'Did you do it three times this week?',
                category: 'Work',
                color: '#3366cc',
                frequency: 3,
                range: 7,
                reminder: false,
                archived: false,
                sort_order: 1,
                created_date: stamp(-60)
            },
            {
                id: IDS.habitPaused,
                name: GOLDEN.habits.paused,
                question: 'Did you keep it up?',
                color: '#cc8833',
                frequency: 1,
                range: 1,
                reminder: false,
                archived: false,
                sort_order: 2,
                created_date: stamp(-60)
            }
        ],

        // Daily habit: an unbroken run of completions ending YESTERDAY, so today's
        // cell is empty and `habit-toggle.spec.ts` has something to toggle. One
        // SKIPPED day sits inside the run.
        trackers: [
            ...[7, 6, 5, 4, 3, 2, 1].map((back, index) => ({
                id: 100 + index,
                habit_id: IDS.habitDaily,
                dated: dayFrom(anchor, -back),
                status: back === 4 ? TrackerStatus.SKIPPED : TrackerStatus.COMPLETED,
                created_date: stampFrom(anchor, -back, '20:00:00')
            })),
            // A clear gap, then an older run — so "longest" is not "current".
            ...[16, 15, 14, 13, 12, 11, 10, 9].map((back, index) => ({
                id: 200 + index,
                habit_id: IDS.habitDaily,
                dated: dayFrom(anchor, -back),
                status: TrackerStatus.COMPLETED,
                created_date: stampFrom(anchor, -back, '20:00:00')
            })),
            // Thrice-weekly: three completions in the last seven days.
            ...[6, 4, 2].map((back, index) => ({
                id: 300 + index,
                habit_id: IDS.habitThrice,
                dated: dayFrom(anchor, -back),
                status: TrackerStatus.COMPLETED,
                created_date: stampFrom(anchor, -back, '20:00:00')
            })),
            // Lapsed habit: nothing recent, so its streak is 0 and its row renders
            // the empty-streak state.
            {
                id: 400,
                habit_id: IDS.habitPaused,
                dated: dayFrom(anchor, -45),
                status: TrackerStatus.COMPLETED,
                created_date: stampFrom(anchor, -45, '20:00:00')
            }
        ],

        // Calendar and integration connections are seeded per-spec, not here:
        // a calendar connection would make the app fetch a live ICS URL on every
        // page load, and integration connections import disabled and tokenless
        // (PATs are never round-tripped), so they cannot be exercised from a
        // backup anyway. See `flows/connections.spec.ts`.
        calendar_connections: [],
        integration_connections: []
    };
};

export type GoldenProfile = ReturnType<typeof buildGoldenProfile>;
