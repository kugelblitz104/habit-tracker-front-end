import { beforeEach, describe, expect, it } from 'vitest';

import { makeProject, makeTask, projectMap, resetSeq } from '@/test-support/factories';
import { TaskStatus } from '@/types/types';

import { startOfToday } from './compute-band';
import { groupTasksByBand } from './task-bands';
import {
    ACTIVE_STATUS_VALUES,
    activeFilterChips,
    activeFilterCount,
    ALL_PRIORITY_VALUES,
    ALL_STATUS_VALUES,
    buildTaskSections,
    compareSmart,
    DEFAULT_TASK_CONTROLS,
    isClosedStatus,
    isDefaultControls,
    passesDateFilter,
    showClosedSection,
    sortTasks,
    splitTasksForControls,
    statusRank,
    type TaskControlsState
} from './task-controls';

const controls = (overrides: Partial<TaskControlsState> = {}): TaskControlsState => ({
    ...DEFAULT_TASK_CONTROLS,
    ...overrides
});

/** Titles in section order — the assertion shape for most grouping tests. */
const titlesOf = (sections: { tasks: { title: string }[] }[]): string[][] =>
    sections.map((s) => s.tasks.map((t) => t.title));

beforeEach(resetSeq);

describe('status taxonomy', () => {
    it('treats only done and cancelled as closed', () => {
        expect(isClosedStatus(TaskStatus.DONE)).toBe(true);
        expect(isClosedStatus(TaskStatus.CANCELLED)).toBe(true);
        for (const status of [
            TaskStatus.OPEN,
            TaskStatus.IN_PROGRESS,
            TaskStatus.SCHEDULED,
            TaskStatus.BLOCKED,
            TaskStatus.NEEDS_INFO,
            TaskStatus.DEFERRED,
            TaskStatus.PENDING
        ]) {
            expect(isClosedStatus(status), String(status)).toBe(false);
        }
    });

    it('exposes active statuses as all statuses minus the closed pair', () => {
        expect(ALL_STATUS_VALUES).toHaveLength(9);
        expect(ACTIVE_STATUS_VALUES).toHaveLength(7);
        expect(ACTIVE_STATUS_VALUES).not.toContain(TaskStatus.DONE);
        expect(ACTIVE_STATUS_VALUES).not.toContain(TaskStatus.CANCELLED);
    });

    it('ranks statuses in the documented order', () => {
        const ordered = [
            TaskStatus.IN_PROGRESS,
            TaskStatus.OPEN,
            TaskStatus.SCHEDULED,
            TaskStatus.PENDING,
            TaskStatus.BLOCKED,
            TaskStatus.NEEDS_INFO,
            TaskStatus.DEFERRED,
            TaskStatus.DONE,
            TaskStatus.CANCELLED
        ];
        const ranks = ordered.map(statusRank);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        expect(new Set(ranks).size).toBe(ordered.length);
    });

    it('sorts an unknown status as if it were open', () => {
        expect(statusRank(999)).toBe(statusRank(TaskStatus.OPEN));
    });
});

describe('compareSmart', () => {
    it('puts in-progress above open regardless of priority', () => {
        const inProgress = makeTask({ status: TaskStatus.IN_PROGRESS, priority: 0 });
        const open = makeTask({ status: TaskStatus.OPEN, priority: 3 });
        expect(compareSmart(inProgress, open)).toBeLessThan(0);
    });

    it('breaks a status tie by priority, descending', () => {
        const high = makeTask({ priority: 3 });
        const low = makeTask({ priority: 1 });
        expect(compareSmart(high, low)).toBeLessThan(0);
    });

    it('breaks a priority tie by due date ascending, nulls last', () => {
        const soon = makeTask({ due_date: '2026-03-10' });
        const later = makeTask({ due_date: '2026-04-10' });
        const undated = makeTask({ due_date: null });
        expect(compareSmart(soon, later)).toBeLessThan(0);
        expect(compareSmart(soon, undated)).toBeLessThan(0);
        expect(compareSmart(undated, later)).toBeGreaterThan(0);
    });

    it('falls back to created_date as a total order', () => {
        const first = makeTask();
        const second = makeTask();
        expect(compareSmart(first, second)).toBeLessThan(0);
        expect(compareSmart(second, first)).toBeGreaterThan(0);
        expect(compareSmart(first, first)).toBe(0);
    });

    it('sorts a realistic mixed list deterministically', () => {
        const deferred = makeTask({ title: 'deferred', status: TaskStatus.DEFERRED, priority: 3 });
        const openHigh = makeTask({ title: 'open-high', priority: 3 });
        const openLowDue = makeTask({ title: 'open-low-due', priority: 1, due_date: '2026-03-02' });
        const running = makeTask({ title: 'running', status: TaskStatus.IN_PROGRESS });
        const blocked = makeTask({ title: 'blocked', status: TaskStatus.BLOCKED, priority: 3 });

        const sorted = [deferred, openHigh, openLowDue, running, blocked].sort(compareSmart);
        expect(sorted.map((t) => t.title)).toEqual([
            'running',
            'open-high',
            'open-low-due',
            'blocked',
            'deferred'
        ]);
    });
});

describe('smart sort parity with Today', () => {
    const TODAY = startOfToday(new Date(2026, 7, 13));

    // The fixture must vary the band INPUTS. makeTask's `band` field is ignored
    // by the UI now, and its defaults (no dates, priority 0) would land every
    // task in `whenever`, making the band key inert and this test vacuous.
    const fixture = () => [
        makeTask({ title: 'inprogress undated', status: TaskStatus.IN_PROGRESS }),
        makeTask({ title: 'open overdue', due_date: '2026-07-01' }),
        makeTask({ title: 'open high', priority: 3 }),
        makeTask({ title: 'open next week', due_date: '2026-08-18' }),
        makeTask({ title: 'open medium', priority: 2 }),
        makeTask({ title: 'open undated' }),
        makeTask({ title: 'blocked undated', status: TaskStatus.BLOCKED })
    ];

    it('orders identically to the flattened Today grouping', () => {
        const tasks = fixture();
        const flat = sortTasks(tasks, 'smart', 'asc', TODAY).map((t) => t.title);
        const today = groupTasksByBand(tasks, TODAY)
            .flatMap((group) => group.tasks)
            .map((t) => t.title);
        expect(flat).toEqual(today);
    });

    it('puts an open now task above an in-progress whenever task', () => {
        // The exact inversion that was wrong: status rank used to win outright.
        const tasks = [
            makeTask({ title: 'inprogress whenever', status: TaskStatus.IN_PROGRESS }),
            makeTask({ title: 'open now', due_date: '2026-07-01' })
        ];
        expect(sortTasks(tasks, 'smart', 'asc', TODAY).map((t) => t.title)).toEqual([
            'open now',
            'inprogress whenever'
        ]);
    });
});

describe('isDefaultControls', () => {
    it('accepts the defaults', () => {
        expect(isDefaultControls(DEFAULT_TASK_CONTROLS)).toBe(true);
    });

    it('accepts filter selections that differ only in order', () => {
        expect(
            isDefaultControls(
                controls({
                    filterPriorities: [...ALL_PRIORITY_VALUES].reverse(),
                    filterStatuses: [...ACTIVE_STATUS_VALUES].reverse()
                })
            )
        ).toBe(true);
    });

    it('rejects any actual change', () => {
        expect(isDefaultControls(controls({ groupBy: 'project' }))).toBe(false);
        expect(isDefaultControls(controls({ sortBy: 'title' }))).toBe(false);
        expect(isDefaultControls(controls({ sortDir: 'desc' }))).toBe(false);
        expect(isDefaultControls(controls({ filterProjectId: 'none' }))).toBe(false);
        expect(isDefaultControls(controls({ filterPriorities: [3] }))).toBe(false);
        expect(isDefaultControls(controls({ dateField: 'due' }))).toBe(false);
        expect(isDefaultControls(controls({ dateFrom: '2026-03-01' }))).toBe(false);
        expect(isDefaultControls(controls({ dateTo: '2026-03-31' }))).toBe(false);
    });

    it('rejects a genuine subset', () => {
        expect(isDefaultControls(controls({ filterPriorities: [3, 2, 1] }))).toBe(false);
        expect(isDefaultControls(controls({ filterStatuses: [TaskStatus.OPEN] }))).toBe(false);
    });

    it('is fooled by a duplicate padding out the length (characterisation)', () => {
        // `sameSet` is `length === length && every(a in b)`, so a duplicate can
        // stand in for a missing value: [3,3,2,1] reads as equal to [3,2,1,0].
        // Not reachable through the checkbox filter UI, which can only produce
        // sets — recorded so the quirk isn't mistaken for intent, and so that
        // tightening `sameSet` later shows up here as a deliberate change.
        expect(isDefaultControls(controls({ filterPriorities: [3, 3, 2, 1] }))).toBe(true);
    });
});

describe('activeFilterCount', () => {
    it('counts nothing at the defaults', () => {
        // The old bar read "Status (7)" at rest, which is 7 selected statuses,
        // not 7 active filters.
        expect(activeFilterCount(controls())).toBe(0);
    });

    it('counts a project filter', () => {
        expect(activeFilterCount(controls({ filterProjectId: 3 }))).toBe(1);
        expect(activeFilterCount(controls({ filterProjectId: 'none' }))).toBe(1);
    });

    it('counts a narrowed priority or status set', () => {
        expect(activeFilterCount(controls({ filterPriorities: [3] }))).toBe(1);
        expect(activeFilterCount(controls({ filterStatuses: [TaskStatus.OPEN] }))).toBe(1);
    });

    it('counts checking a closed status, since the default is active-only', () => {
        expect(activeFilterCount(controls({ filterStatuses: [...ALL_STATUS_VALUES] }))).toBe(1);
    });

    it('counts a date filter and combines counts', () => {
        expect(activeFilterCount(controls({ dateField: 'due' }))).toBe(1);
        expect(activeFilterCount(controls({ dateField: 'due', filterProjectId: 3 }))).toBe(2);
    });

    it('ignores group and sort, which are not filters', () => {
        expect(activeFilterCount(controls({ groupBy: 'project', sortBy: 'due' }))).toBe(0);
    });
});

describe('activeFilterChips', () => {
    it('produces no chips at the defaults', () => {
        expect(activeFilterChips(controls(), [])).toEqual([]);
    });

    it('produces one chip per active filter, in bar order, and none for the rest', () => {
        const chips = activeFilterChips(
            controls({
                filterProjectId: 3,
                filterPriorities: [3],
                filterStatuses: [TaskStatus.OPEN],
                dateField: 'due'
            }),
            []
        );
        expect(chips.map((c) => c.key)).toEqual(['project', 'priority', 'status', 'date']);
    });

    it('labels the project chip with the resolved name, or "None" for no-project', () => {
        const beta = makeProject({ name: 'Beta Project' });
        expect(activeFilterChips(controls({ filterProjectId: beta.id }), [beta])).toEqual([
            { key: 'project', label: 'Project: Beta Project', reset: { filterProjectId: 'all' } }
        ]);
        expect(activeFilterChips(controls({ filterProjectId: 'none' }), [])).toEqual([
            { key: 'project', label: 'Project: None', reset: { filterProjectId: 'all' } }
        ]);
    });

    it('falls back to "Unknown" for a project id absent from the given list', () => {
        expect(activeFilterChips(controls({ filterProjectId: 404 }), [])).toEqual([
            { key: 'project', label: 'Project: Unknown', reset: { filterProjectId: 'all' } }
        ]);
    });

    it('lists priority names in PRIORITY_ORDER (high to none), not selection order', () => {
        // Deliberately the reverse of the picker order: if the implementation
        // echoed input order instead of PRIORITY_ORDER, this would read
        // "None, Low, High" instead.
        const chips = activeFilterChips(controls({ filterPriorities: [0, 1, 3] }), []);
        expect(chips).toEqual([
            {
                key: 'priority',
                label: 'Priority: High, Low, None',
                reset: { filterPriorities: [...DEFAULT_TASK_CONTROLS.filterPriorities] }
            }
        ]);
    });

    it('lists status names in STATUS_ORDER (smart-rank order), not selection order', () => {
        // Deliberately out of both selection order and TaskStatus numeric order.
        const chips = activeFilterChips(
            controls({
                filterStatuses: [TaskStatus.DEFERRED, TaskStatus.OPEN, TaskStatus.IN_PROGRESS]
            }),
            []
        );
        expect(chips).toEqual([
            {
                key: 'status',
                label: 'Status: In progress, Open, Deferred',
                reset: { filterStatuses: [...DEFAULT_TASK_CONTROLS.filterStatuses] }
            }
        ]);
    });

    it('labels the date chip with just the field when no range is set', () => {
        expect(activeFilterChips(controls({ dateField: 'due' }), [])).toEqual([
            {
                key: 'date',
                label: 'Date: Due',
                reset: { dateField: null, dateFrom: '', dateTo: '' }
            }
        ]);
    });

    it('appends the range to the date chip label when one is set', () => {
        expect(
            activeFilterChips(
                controls({ dateField: 'due', dateFrom: '2026-08-01', dateTo: '2026-08-31' }),
                []
            )
        ).toEqual([
            {
                key: 'date',
                label: 'Date: Due 2026-08-01 → 2026-08-31',
                reset: { dateField: null, dateFrom: '', dateTo: '' }
            }
        ]);
    });

    it("each chip's reset returns exactly that filter to default and leaves the other three alone", () => {
        const narrowed = controls({
            filterProjectId: 3,
            filterPriorities: [3],
            filterStatuses: [TaskStatus.OPEN],
            dateField: 'due',
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31'
        });
        const before = activeFilterChips(narrowed, []).map((c) => c.key);
        expect(before).toEqual(['project', 'priority', 'status', 'date']);

        for (const chip of activeFilterChips(narrowed, [])) {
            const after: TaskControlsState = { ...narrowed, ...chip.reset };
            const afterKeys = activeFilterChips(after, []).map((c) => c.key);
            expect(afterKeys, `resetting ${chip.key}`).toEqual(
                before.filter((k) => k !== chip.key)
            );
        }

        // The date reset specifically clears all three date fields together.
        // A lingering range with no field selected would leave no chip to
        // remove it, since `dateFilterActive` only looks at `dateField`.
        const dateChip = activeFilterChips(narrowed, []).find((c) => c.key === 'date')!;
        const afterDateReset = { ...narrowed, ...dateChip.reset };
        expect(afterDateReset.dateField).toBeNull();
        expect(afterDateReset.dateFrom).toBe('');
        expect(afterDateReset.dateTo).toBe('');
    });
});

describe('passesDateFilter', () => {
    it('passes everything when no field is selected', () => {
        expect(passesDateFilter(makeTask({ due_date: null }), controls())).toBe(true);
    });

    it('excludes tasks missing the selected date', () => {
        const task = makeTask({ due_date: null });
        expect(passesDateFilter(task, controls({ dateField: 'due' }))).toBe(false);
    });

    it('applies inclusive bounds', () => {
        const task = makeTask({ due_date: '2026-03-15' });
        const range = { dateField: 'due' as const, dateFrom: '2026-03-15', dateTo: '2026-03-15' };
        expect(passesDateFilter(task, controls(range))).toBe(true);
        expect(passesDateFilter(task, controls({ ...range, dateFrom: '2026-03-16' }))).toBe(false);
        expect(passesDateFilter(task, controls({ ...range, dateTo: '2026-03-14' }))).toBe(false);
    });

    it('treats an empty bound as open-ended', () => {
        const task = makeTask({ due_date: '2026-03-15' });
        expect(
            passesDateFilter(task, controls({ dateField: 'due', dateFrom: '', dateTo: '' }))
        ).toBe(true);
    });

    it('takes the date part of the datetime fields', () => {
        const done = makeTask({
            status: TaskStatus.DONE,
            closed_date: '2026-03-15T18:42:11.123',
            created_date: '2026-02-01T09:00:00'
        });
        const onCompleted = {
            dateField: 'completed' as const,
            dateFrom: '2026-03-15',
            dateTo: '2026-03-15'
        };
        expect(passesDateFilter(done, controls(onCompleted))).toBe(true);

        const onCreated = {
            dateField: 'created' as const,
            dateFrom: '2026-02-01',
            dateTo: '2026-02-01'
        };
        expect(passesDateFilter(done, controls(onCreated))).toBe(true);
    });

    it('compares the scheduled field independently of due', () => {
        const task = makeTask({ due_date: '2026-01-01', scheduled_date: '2026-03-15' });
        const range = { dateFrom: '2026-03-01', dateTo: '2026-03-31' };
        expect(passesDateFilter(task, controls({ dateField: 'scheduled', ...range }))).toBe(true);
        expect(passesDateFilter(task, controls({ dateField: 'due', ...range }))).toBe(false);
    });
});

describe('splitTasksForControls', () => {
    it('separates closed from active', () => {
        const open = makeTask({ title: 'open' });
        const done = makeTask({ title: 'done', status: TaskStatus.DONE });
        const cancelled = makeTask({ title: 'cancelled', status: TaskStatus.CANCELLED });

        const { active, closed } = splitTasksForControls(
            [open, done, cancelled],
            // Closed statuses must be selected, or the filter drops them first.
            controls({ filterStatuses: ALL_STATUS_VALUES })
        );
        expect(active.map((t) => t.title)).toEqual(['open']);
        expect(closed.map((t) => t.title)).toEqual(['done', 'cancelled']);
    });

    it('drops closed tasks entirely under the default status filter', () => {
        const done = makeTask({ status: TaskStatus.DONE });
        const { active, closed } = splitTasksForControls([done], controls());
        expect(active).toEqual([]);
        expect(closed).toEqual([]);
    });

    it('filters by project, including the no-project case', () => {
        const assigned = makeTask({ title: 'assigned', project_id: 7 });
        const loose = makeTask({ title: 'loose', project_id: null });

        expect(
            splitTasksForControls([assigned, loose], controls({ filterProjectId: 7 })).active.map(
                (t) => t.title
            )
        ).toEqual(['assigned']);
        expect(
            splitTasksForControls(
                [assigned, loose],
                controls({ filterProjectId: 'none' })
            ).active.map((t) => t.title)
        ).toEqual(['loose']);
        expect(
            splitTasksForControls([assigned, loose], controls({ filterProjectId: 'all' })).active
        ).toHaveLength(2);
    });

    it('filters by priority membership', () => {
        const high = makeTask({ title: 'high', priority: 3 });
        const none = makeTask({ title: 'none', priority: 0 });
        const { active } = splitTasksForControls([high, none], controls({ filterPriorities: [3] }));
        expect(active.map((t) => t.title)).toEqual(['high']);
    });
});

describe('showClosedSection', () => {
    it('is hidden by default', () => {
        expect(showClosedSection(DEFAULT_TASK_CONTROLS)).toBe(false);
    });

    it('shows once a closed status is selected', () => {
        expect(showClosedSection(controls({ filterStatuses: [TaskStatus.DONE] }))).toBe(true);
        expect(showClosedSection(controls({ filterStatuses: [TaskStatus.CANCELLED] }))).toBe(true);
    });

    it('shows when filtering by completed date, which only closed tasks satisfy', () => {
        expect(showClosedSection(controls({ dateField: 'completed' }))).toBe(true);
    });
});

describe('buildTaskSections', () => {
    it('returns one unlabelled section when ungrouped', () => {
        const sections = buildTaskSections([makeTask(), makeTask()], controls(), new Map());
        expect(sections).toHaveLength(1);
        expect(sections[0]!.key).toBe('all');
        expect(sections[0]!.label).toBeNull();
        expect(sections[0]!.tasks).toHaveLength(2);
    });

    it('groups by priority high to none, dropping empty sections', () => {
        const tasks = [
            makeTask({ title: 'high', priority: 3 }),
            makeTask({ title: 'none', priority: 0 }),
            makeTask({ title: 'high2', priority: 3 })
        ];
        const sections = buildTaskSections(tasks, controls({ groupBy: 'priority' }), new Map());
        expect(sections.map((s) => s.label)).toEqual(['High', 'None']);
        expect(titlesOf(sections)).toEqual([['high', 'high2'], ['none']]);
    });

    it('groups by status in smart-rank order', () => {
        const tasks = [
            makeTask({ title: 'open', status: TaskStatus.OPEN }),
            makeTask({ title: 'running', status: TaskStatus.IN_PROGRESS }),
            makeTask({ title: 'blocked', status: TaskStatus.BLOCKED })
        ];
        const sections = buildTaskSections(tasks, controls({ groupBy: 'status' }), new Map());
        expect(titlesOf(sections)).toEqual([['running'], ['open'], ['blocked']]);
        expect(sections.every((s) => s.color)).toBe(true);
    });

    it('groups by project A-Z with No project last', () => {
        const zeta = makeProject({ name: 'Zeta' });
        const alpha = makeProject({ name: 'Alpha' });
        const tasks = [
            makeTask({ title: 'loose', project_id: null }),
            makeTask({ title: 'in-zeta', project_id: zeta.id }),
            makeTask({ title: 'in-alpha', project_id: alpha.id })
        ];
        const sections = buildTaskSections(
            tasks,
            controls({ groupBy: 'project' }),
            projectMap(zeta, alpha)
        );
        expect(sections.map((s) => s.label)).toEqual(['Alpha', 'Zeta', 'No project']);
        expect(titlesOf(sections)).toEqual([['in-alpha'], ['in-zeta'], ['loose']]);
    });

    it('falls back to a generic label for an unknown project', () => {
        const tasks = [makeTask({ project_id: 404 })];
        const sections = buildTaskSections(tasks, controls({ groupBy: 'project' }), new Map());
        expect(sections.map((s) => s.label)).toEqual(['Project']);
    });

    it('never includes closed tasks, even when the Closed section is on', () => {
        const tasks = [
            makeTask({ title: 'open' }),
            makeTask({ title: 'done', status: TaskStatus.DONE })
        ];
        const sections = buildTaskSections(
            tasks,
            controls({ filterStatuses: ALL_STATUS_VALUES }),
            new Map()
        );
        expect(titlesOf(sections)).toEqual([['open']]);
    });

    describe('sorting', () => {
        const byTitle = (
            sortBy: TaskControlsState['sortBy'],
            sortDir: TaskControlsState['sortDir']
        ) =>
            buildTaskSections(
                [
                    makeTask({
                        title: 'b',
                        priority: 1,
                        due_date: '2026-03-20',
                        status: TaskStatus.SCHEDULED
                    }),
                    makeTask({ title: 'a', priority: 3, due_date: null, status: TaskStatus.OPEN }),
                    makeTask({
                        title: 'c',
                        priority: 2,
                        due_date: '2026-03-10',
                        status: TaskStatus.BLOCKED
                    })
                ],
                controls({ sortBy, sortDir }),
                new Map()
            )[0]!.tasks.map((t) => t.title);

        it('sorts by title in both directions', () => {
            expect(byTitle('title', 'asc')).toEqual(['a', 'b', 'c']);
            expect(byTitle('title', 'desc')).toEqual(['c', 'b', 'a']);
        });

        it('sorts by priority ascending then descending', () => {
            expect(byTitle('priority', 'asc')).toEqual(['b', 'c', 'a']);
            expect(byTitle('priority', 'desc')).toEqual(['a', 'c', 'b']);
        });

        it('keeps undated tasks last for a due sort in both directions', () => {
            expect(byTitle('due', 'asc')).toEqual(['c', 'b', 'a']);
            expect(byTitle('due', 'desc')).toEqual(['b', 'c', 'a']);
        });

        it('sorts by created date', () => {
            expect(byTitle('created', 'asc')).toEqual(['b', 'a', 'c']);
            expect(byTitle('created', 'desc')).toEqual(['c', 'a', 'b']);
        });

        it('sorts by raw status value', () => {
            expect(byTitle('status', 'asc')).toEqual(['a', 'b', 'c']);
        });

        it('reverses the smart sort for desc', () => {
            expect(byTitle('smart', 'desc')).toEqual([...byTitle('smart', 'asc')].reverse());
        });
    });

    it('does not mutate the input array', () => {
        const tasks = [makeTask({ title: 'b' }), makeTask({ title: 'a' })];
        const original = tasks.map((t) => t.title);
        buildTaskSections(tasks, controls({ sortBy: 'title' }), new Map());
        expect(tasks.map((t) => t.title)).toEqual(original);
    });
});
