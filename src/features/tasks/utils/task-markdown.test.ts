import { beforeEach, describe, expect, it } from 'vitest';

import type { TaskRead } from '@/api';
import { makeProject, makeTask, projectMap, resetSeq } from '@/test-support/factories';
import { TaskStatus } from '@/types/types';

import type { TaskSection } from './task-controls';
import { renderTaskMarkdown, renderTasksMarkdown } from './task-markdown';

/**
 * Markdown export. `renderTasksMarkdown` takes an injectable `today` for the
 * "Exported" line, so every case pins it. `downloadMarkdownFile` is DOM-only and
 * is left to the e2e suite.
 */
const TODAY = new Date(2026, 2, 15);

const section = (label: string | null, tasks: TaskRead[]): TaskSection => ({
    key: label ?? 'all',
    label,
    tasks
});

beforeEach(resetSeq);

describe('renderTaskMarkdown', () => {
    it('renders a bare open task as a single checklist line', () => {
        const task = makeTask({ title: 'Just a task' });
        expect(renderTaskMarkdown(task, [], new Map())).toBe('- [ ] Just a task\n');
    });

    it('ticks the checkbox only for done', () => {
        expect(
            renderTaskMarkdown(makeTask({ status: TaskStatus.DONE, title: 'D' }), [], new Map())
        ).toBe('- [x] D\n');
        expect(
            renderTaskMarkdown(
                makeTask({ status: TaskStatus.CANCELLED, title: 'C' }),
                [],
                new Map()
            )
        ).toBe('- [ ] C\n  - Status: Cancelled\n');
    });

    it('omits the status bullet for open and done, the two default states', () => {
        expect(
            renderTaskMarkdown(makeTask({ status: TaskStatus.OPEN }), [], new Map())
        ).not.toMatch(/Status:/);
        expect(
            renderTaskMarkdown(makeTask({ status: TaskStatus.DONE }), [], new Map())
        ).not.toMatch(/Status:/);
    });

    it('names every other status from the shared status metadata', () => {
        const labels = [
            [TaskStatus.IN_PROGRESS, 'In progress'],
            [TaskStatus.SCHEDULED, 'Scheduled'],
            [TaskStatus.BLOCKED, 'Blocked'],
            [TaskStatus.NEEDS_INFO, 'Needs info'],
            [TaskStatus.DEFERRED, 'Deferred'],
            [TaskStatus.PENDING, 'Pending'],
            [TaskStatus.UNCLEAR, 'Unclear'],
            [TaskStatus.CANCELLED, 'Cancelled']
        ] as const;
        for (const [status, label] of labels) {
            expect(renderTaskMarkdown(makeTask({ status }), [], new Map()), label).toContain(
                `  - Status: ${label}\n`
            );
        }
    });

    it('omits priority None and names the rest', () => {
        expect(renderTaskMarkdown(makeTask({ priority: 0 }), [], new Map())).not.toMatch(
            /Priority:/
        );
        expect(renderTaskMarkdown(makeTask({ priority: 1 }), [], new Map())).toContain(
            '  - Priority: Low\n'
        );
        expect(renderTaskMarkdown(makeTask({ priority: 2 }), [], new Map())).toContain(
            '  - Priority: Medium\n'
        );
        expect(renderTaskMarkdown(makeTask({ priority: 3 }), [], new Map())).toContain(
            '  - Priority: High\n'
        );
    });

    it('renders every detail bullet in a fixed order', () => {
        const project = makeProject({ name: 'Alpha' });
        const task = makeTask({
            title: 'Ship it',
            status: TaskStatus.BLOCKED,
            priority: 3,
            due_date: '2026-07-08',
            due_time: '14:00',
            scheduled_date: '2026-07-07',
            scheduled_time: '09:00',
            project_id: project.id,
            block_reason: '  waiting on infra  ',
            notes: 'line one\nline two'
        });

        expect(renderTaskMarkdown(task, [], projectMap(project))).toBe(
            [
                '- [ ] Ship it',
                '  - Status: Blocked',
                '  - Priority: High',
                '  - Due: Jul 8th 2:00p',
                '  - Scheduled: Jul 7th 9:00a',
                '  - Project: Alpha',
                '  - Blocked: waiting on infra',
                '  - Notes:',
                '    line one',
                '    line two',
                ''
            ].join('\n')
        );
    });

    it('leaves the time off a date-only due or scheduled bullet', () => {
        const task = makeTask({
            due_date: '2026-07-08',
            due_time: null,
            scheduled_date: '2026-07-07',
            scheduled_time: null
        });
        const md = renderTaskMarkdown(task, [], new Map());
        expect(md).toContain('  - Due: Jul 8th\n');
        expect(md).toContain('  - Scheduled: Jul 7th\n');
    });

    it('skips a whitespace-only block reason or note', () => {
        const task = makeTask({ block_reason: '   ', notes: '\n  \n' });
        expect(renderTaskMarkdown(task, [], new Map())).toBe(`- [ ] ${task.title}\n`);
    });

    it('indents note lines by four spaces and strips trailing whitespace', () => {
        const task = makeTask({ title: 'N', notes: 'first\n\n  indented   \nlast  ' });
        expect(renderTaskMarkdown(task, [], new Map())).toBe(
            ['- [ ] N', '  - Notes:', '    first', '', '      indented', '    last', ''].join('\n')
        );
    });

    it('omits the project bullet when the id is unknown to the map', () => {
        const task = makeTask({ project_id: 404 });
        expect(renderTaskMarkdown(task, [], new Map())).not.toMatch(/Project:/);
    });

    it('nests subtasks two spaces under the parent, with their own bullets', () => {
        const parent = makeTask({ title: 'Parent' });
        const child = makeTask({
            title: 'Child',
            parent_id: parent.id,
            priority: 2,
            due_date: '2026-07-08'
        });
        expect(renderTaskMarkdown(parent, [child], new Map())).toBe(
            [
                '- [ ] Parent',
                '  - [ ] Child',
                '    - Priority: Medium',
                '    - Due: Jul 8th',
                ''
            ].join('\n')
        );
    });

    it('orders subtasks by priority desc, then due date asc with nulls last', () => {
        const parent = makeTask({ title: 'Parent' });
        const subtasks = [
            makeTask({ title: 'low-undated', parent_id: parent.id, priority: 1 }),
            makeTask({ title: 'high', parent_id: parent.id, priority: 3 }),
            makeTask({
                title: 'low-late',
                parent_id: parent.id,
                priority: 1,
                due_date: '2026-08-01'
            }),
            makeTask({
                title: 'low-soon',
                parent_id: parent.id,
                priority: 1,
                due_date: '2026-07-01'
            })
        ];
        const titles = renderTaskMarkdown(parent, subtasks, new Map())
            .split('\n')
            .filter((line) => line.startsWith('  - [ ]'))
            .map((line) => line.replace('  - [ ] ', ''));
        expect(titles).toEqual(['high', 'low-soon', 'low-late', 'low-undated']);
    });

    it('breaks a full tie between subtasks on created date', () => {
        const parent = makeTask({ title: 'Parent' });
        const first = makeTask({ title: 'first', parent_id: parent.id });
        const second = makeTask({ title: 'second', parent_id: parent.id });
        const md = renderTaskMarkdown(parent, [second, first], new Map());
        expect(md.indexOf('first')).toBeLessThan(md.indexOf('second'));
    });

    it('does not mutate the subtask array it is handed', () => {
        const parent = makeTask({ title: 'Parent' });
        const subtasks = [
            makeTask({ title: 'low', parent_id: parent.id, priority: 1 }),
            makeTask({ title: 'high', parent_id: parent.id, priority: 3 })
        ];
        renderTaskMarkdown(parent, subtasks, new Map());
        expect(subtasks.map((task) => task.title)).toEqual(['low', 'high']);
    });

    it('nests whatever list it is handed without checking parent_id', () => {
        // The single-task export trusts its caller: it maps the whole `subtasks`
        // array under `task.id`, so a grandchild passed in flattens to the child's
        // level and an unrelated task would nest just the same.
        const parent = makeTask({ title: 'Parent' });
        const child = makeTask({ title: 'Child', parent_id: parent.id });
        const grandchild = makeTask({ title: 'Grandchild', parent_id: child.id });
        expect(renderTaskMarkdown(parent, [child, grandchild], new Map())).toBe(
            ['- [ ] Parent', '  - [ ] Child', '  - [ ] Grandchild', ''].join('\n')
        );
    });

    it('falls back to the raw status number for an unknown status (characterisation)', () => {
        // `STATUS_META[status]?.label ?? status` — a status the front-end has not
        // been regenerated for renders as its number rather than blowing up.
        expect(renderTaskMarkdown(makeTask({ status: 99, title: 'X' }), [], new Map())).toBe(
            '- [ ] X\n  - Status: 99\n'
        );
    });
});

describe('renderTasksMarkdown', () => {
    it('writes a heading and a pinned export date', () => {
        const document = renderTasksMarkdown({
            title: 'All tasks',
            sections: [],
            allTasks: [],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).toBe('# All tasks — Tasks\n\n_Exported Mar 15th_\n');
    });

    it('renders each section as a heading followed by its tasks', () => {
        const now = makeTask({ title: 'A' });
        const whenever = makeTask({ title: 'B' });
        const document = renderTasksMarkdown({
            title: 'All tasks',
            sections: [section('Needs you now', [now]), section('Whenever', [whenever])],
            allTasks: [now, whenever],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).toBe(
            [
                '# All tasks — Tasks',
                '',
                '_Exported Mar 15th_',
                '',
                '## Needs you now',
                '',
                '- [ ] A',
                '',
                '## Whenever',
                '',
                '- [ ] B',
                ''
            ].join('\n')
        );
    });

    it('skips empty sections entirely', () => {
        const task = makeTask({ title: 'A' });
        const document = renderTasksMarkdown({
            title: 'Alpha',
            sections: [section('Empty', []), section('Full', [task])],
            allTasks: [task],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).not.toContain('Empty');
        expect(document).toContain('## Full');
    });

    it('labels an unlabelled (flat) section "Tasks"', () => {
        const task = makeTask({ title: 'A' });
        const document = renderTasksMarkdown({
            title: 'Alpha',
            sections: [section(null, [task])],
            allTasks: [task],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).toContain('## Tasks\n');
    });

    it('nests subtasks under their parent from allTasks, whatever section it landed in', () => {
        const parent = makeTask({ title: 'Parent' });
        const child = makeTask({ title: 'Child', parent_id: parent.id });
        const document = renderTasksMarkdown({
            title: 'Alpha',
            sections: [section('Now', [parent])],
            allTasks: [parent, child],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).toContain('- [ ] Parent\n  - [ ] Child\n');
    });

    it('drops a grandchild, because nesting never recurses (characterisation)', () => {
        // Subtasks render through `renderTaskLines`, which has no recursion, so a
        // sub-subtask appears nowhere in the document. The task tree is one level
        // deep in the product today, so this is a limit rather than a live bug.
        const parent = makeTask({ title: 'Parent' });
        const child = makeTask({ title: 'Child', parent_id: parent.id });
        const grandchild = makeTask({ title: 'Grandchild', parent_id: child.id });
        const document = renderTasksMarkdown({
            title: 'Alpha',
            sections: [section('Now', [parent])],
            allTasks: [parent, child, grandchild],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).toContain('  - [ ] Child\n');
        expect(document).not.toContain('Grandchild');
    });

    it('leaves the Closed section out when no closed tasks are passed', () => {
        const task = makeTask({ title: 'A' });
        const shared = {
            title: 'Alpha',
            sections: [section('Now', [task])],
            allTasks: [task],
            projectsById: new Map(),
            today: TODAY
        };
        expect(renderTasksMarkdown(shared)).not.toContain('## Closed');
        expect(renderTasksMarkdown({ ...shared, closedTasks: [] })).not.toContain('## Closed');
    });

    it('appends closed tasks most recently closed first', () => {
        const older = makeTask({
            title: 'older',
            status: TaskStatus.DONE,
            closed_date: '2026-03-10T09:00:00'
        });
        const newer = makeTask({
            title: 'newer',
            status: TaskStatus.DONE,
            closed_date: '2026-03-12T09:00:00'
        });
        const document = renderTasksMarkdown({
            title: 'Alpha',
            sections: [],
            closedTasks: [older, newer],
            allTasks: [older, newer],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document).toBe(
            [
                '# Alpha — Tasks',
                '',
                '_Exported Mar 15th_',
                '',
                '## Closed',
                '',
                '- [x] newer',
                '- [x] older',
                ''
            ].join('\n')
        );
    });

    it('sorts a closed task with no closed date last', () => {
        const dated = makeTask({
            title: 'dated',
            status: TaskStatus.DONE,
            closed_date: '2026-03-10T09:00:00'
        });
        const undated = makeTask({ title: 'undated', status: TaskStatus.CANCELLED });
        const document = renderTasksMarkdown({
            title: 'Alpha',
            sections: [],
            closedTasks: [undated, dated],
            allTasks: [undated, dated],
            projectsById: new Map(),
            today: TODAY
        });
        expect(document.indexOf('dated\n')).toBeLessThan(document.indexOf('undated'));
    });

    it('does not mutate the closed-task array it is handed', () => {
        const older = makeTask({ title: 'older', closed_date: '2026-03-10T09:00:00' });
        const newer = makeTask({ title: 'newer', closed_date: '2026-03-12T09:00:00' });
        const closedTasks = [older, newer];
        renderTasksMarkdown({
            title: 'Alpha',
            sections: [],
            closedTasks,
            allTasks: closedTasks,
            projectsById: new Map(),
            today: TODAY
        });
        expect(closedTasks.map((task) => task.title)).toEqual(['older', 'newer']);
    });

    it('resolves project names through the map for every task', () => {
        const project = makeProject({ name: 'Alpha' });
        const task = makeTask({ title: 'A', project_id: project.id });
        const document = renderTasksMarkdown({
            title: 'All tasks',
            sections: [section('Now', [task])],
            allTasks: [task],
            projectsById: projectMap(project),
            today: TODAY
        });
        expect(document).toContain('  - Project: Alpha\n');
    });
});
