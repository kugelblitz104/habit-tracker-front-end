import type { HabitRead, ProjectRead, TaskRead, TrackerLite } from '@/api';
import { TaskStatus, TrackerStatus } from '@/types/types';

/**
 * Fixture builders for the unit suites (`*.test.ts`). Test-only — nothing in
 * `src/` outside a test file should import from here.
 *
 * Every field the generated `TaskRead`/`ProjectRead` marks optional still gets a
 * concrete default, because the modules under test read them with `?? 0` / `?? ''`
 * fallbacks and a fixture that leaves them `undefined` would silently exercise
 * the fallback instead of the case the test names.
 */

let seq = 0;
/** Reset the id/date counter so a test can assert on stable ids. */
export const resetSeq = (): void => {
    seq = 0;
};

export const makeTask = (overrides: Partial<TaskRead> = {}): TaskRead => {
    seq += 1;
    return {
        id: seq,
        profile_id: 1,
        title: `Task ${seq}`,
        // The API derives this from the title and never returns it null. Kept in
        // step with `title` above so a fixture task's URL is what the real one
        // would be; the numbering rule itself is the backend's, tested there.
        slug: `task-${seq}`,
        priority: 0,
        status: TaskStatus.OPEN,
        due_date: null,
        due_time: null,
        scheduled_date: null,
        scheduled_time: null,
        closed_date: null,
        project_id: null,
        parent_id: null,
        notes: null,
        block_reason: null,
        estimated_effort: null,
        sort_order: seq,
        band: 'whenever',
        subtask_count: 0,
        subtask_done_count: 0,
        // Monotonic so `created_date` is a deterministic final tiebreaker in the
        // smart sort; padded so string comparison matches numeric order past 9.
        created_date: `2026-03-01T00:00:${String(seq).padStart(2, '0')}`,
        ...overrides
    };
};

export const makeProject = (overrides: Partial<ProjectRead> = {}): ProjectRead => {
    seq += 1;
    return {
        id: seq,
        profile_id: 1,
        name: `Project ${seq}`,
        color: '#3366cc',
        created_date: `2026-03-01T00:00:${String(seq).padStart(2, '0')}`,
        ...overrides
    };
};

/**
 * `frequency`/`range` and `created_date` are the only fields the KPI math reads,
 * so pass those explicitly; the rest exist to satisfy the generated `HabitRead`.
 */
export const makeHabit = (overrides: Partial<HabitRead> = {}): HabitRead => {
    seq += 1;
    return {
        id: seq,
        profile_id: 1,
        name: `Habit ${seq}`,
        question: 'Did you?',
        color: '#3366cc',
        frequency: 1,
        range: 1,
        reminder: false,
        notes: null,
        archived: false,
        sort_order: seq,
        category: null,
        created_date: '2026-03-01T00:00:00',
        updated_date: null,
        completed_today: false,
        skipped_today: false,
        ...overrides
    };
};

/**
 * A tracker in the lightweight shape the dashboard/calendar endpoints return.
 * `dated` is the field everything keys off, so pass it explicitly in any test
 * that cares which day the tracker belongs to.
 */
export const makeTrackerLite = (overrides: Partial<TrackerLite> = {}): TrackerLite => {
    seq += 1;
    return {
        id: seq,
        dated: '2026-03-15',
        status: TrackerStatus.NOT_COMPLETED,
        has_note: false,
        ...overrides
    };
};

/** `projectsById` map in the shape `buildTaskSections` expects. */
export const projectMap = (...projects: ProjectRead[]): Map<number, ProjectRead> =>
    new Map(projects.map((p) => [p.id, p]));
