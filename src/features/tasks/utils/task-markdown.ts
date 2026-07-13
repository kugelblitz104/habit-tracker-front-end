import type { ProjectRead, TaskRead } from '@/api';
import { parseLocalDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';
import { STATUS_META } from '../components/status-config';
import type { TaskSection } from './task-controls';
import { formatCompactTime, formatShortDate } from './task-format';
import { PRIORITY_LABELS } from './priority-config';

/**
 * Render the CURRENT filtered/grouped/sorted task view (All-tasks or a single
 * project) as Markdown, mirroring the backend export's checklist style
 * (`habit_tracker/services/task_export.py`) — a checklist line per task plus
 * indented detail bullets, subtasks nested two spaces under their parent —
 * but starting from the sections the UI already built, so the document
 * matches exactly what's on screen (including the Closed section, if it's
 * visible). Pure: no DOM/network access, so it's trivially unit-testable.
 */

const formatWhen = (dateStr: string, timeStr?: string | null): string => {
    const date = formatShortDate(parseLocalDate(dateStr));
    const time = formatCompactTime(timeStr);
    return time ? `${date} ${time}` : date;
};

/** Priority desc, due date asc (nulls last), created date asc — the same
 *  fixed ordering the backend export uses for a parent's subtasks. */
const compareForSubtasks = (a: TaskRead, b: TaskRead): number => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa;
    const da = a.due_date ?? '';
    const db = b.due_date ?? '';
    if (!!da !== !!db) return da ? -1 : 1;
    if (da !== db) return da < db ? -1 : 1;
    return a.created_date.localeCompare(b.created_date);
};

const renderTaskLines = (
    task: TaskRead,
    projectsById: Map<number, ProjectRead>,
    indent: string
): string[] => {
    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const checkbox = status === TaskStatus.DONE ? 'x' : ' ';
    const lines = [`${indent}- [${checkbox}] ${task.title}`];

    if (status !== TaskStatus.OPEN && status !== TaskStatus.DONE) {
        lines.push(`${indent}  - Status: ${STATUS_META[status]?.label ?? status}`);
    }
    const priority = task.priority ?? 0;
    if (priority > 0) {
        lines.push(`${indent}  - Priority: ${PRIORITY_LABELS[priority] ?? priority}`);
    }
    if (task.due_date) {
        lines.push(`${indent}  - Due: ${formatWhen(task.due_date, task.due_time)}`);
    }
    if (task.scheduled_date) {
        lines.push(`${indent}  - Scheduled: ${formatWhen(task.scheduled_date, task.scheduled_time)}`);
    }
    const project = task.project_id != null ? projectsById.get(task.project_id) : undefined;
    if (project) lines.push(`${indent}  - Project: ${project.name}`);
    if (task.block_reason?.trim()) lines.push(`${indent}  - Blocked: ${task.block_reason.trim()}`);
    if (task.notes?.trim()) {
        lines.push(`${indent}  - Notes:`);
        for (const noteLine of task.notes.split('\n')) {
            lines.push(`${indent}    ${noteLine}`.replace(/\s+$/, ''));
        }
    }
    return lines;
};

const renderTaskWithSubtasks = (
    task: TaskRead,
    projectsById: Map<number, ProjectRead>,
    subtasksByParent: Map<number, TaskRead[]>
): string[] => {
    const lines = renderTaskLines(task, projectsById, '');
    const subtasks = [...(subtasksByParent.get(task.id) ?? [])].sort(compareForSubtasks);
    for (const subtask of subtasks) {
        lines.push(...renderTaskLines(subtask, projectsById, '  '));
    }
    return lines;
};

export type TaskMarkdownInput = {
    /** Document heading, e.g. "All tasks" or the project's name. */
    title: string;
    /** Active sections in display order, exactly as built by `buildTaskSections`
     *  / rendered by `TaskListView`. */
    sections: TaskSection[];
    /** Closed (done/cancelled) tasks — pass only when the Closed section is
     *  actually visible on screen; omit/empty to leave it out of the document. */
    closedTasks?: TaskRead[];
    /** Every task the page has loaded (including subtasks), used to nest
     *  subtasks under their parent regardless of which section it landed in. */
    allTasks: TaskRead[];
    projectsById: Map<number, ProjectRead>;
    today?: Date;
};

/** Render the given task view as a Markdown document (string only — no I/O). */
export const renderTasksMarkdown = ({
    title,
    sections,
    closedTasks = [],
    allTasks,
    projectsById,
    today = new Date()
}: TaskMarkdownInput): string => {
    const subtasksByParent = new Map<number, TaskRead[]>();
    for (const task of allTasks) {
        if (task.parent_id == null) continue;
        const list = subtasksByParent.get(task.parent_id) ?? [];
        list.push(task);
        subtasksByParent.set(task.parent_id, list);
    }

    const lines = [`# ${title} — Tasks`, '', `_Exported ${formatShortDate(today)}_`];

    for (const section of sections) {
        if (section.tasks.length === 0) continue;
        lines.push('', `## ${section.label ?? 'Tasks'}`, '');
        for (const task of section.tasks) {
            lines.push(...renderTaskWithSubtasks(task, projectsById, subtasksByParent));
        }
    }

    if (closedTasks.length > 0) {
        lines.push('', '## Closed', '');
        const sortedClosed = [...closedTasks].sort((a, b) => {
            const ca = a.closed_date ?? '';
            const cb = b.closed_date ?? '';
            return cb.localeCompare(ca); // most recent first
        });
        for (const task of sortedClosed) {
            lines.push(...renderTaskWithSubtasks(task, projectsById, subtasksByParent));
        }
    }

    return lines.join('\n') + '\n';
};

/** Lowercase and collapse non-alphanumeric runs to single dashes ("My Project!" -> "my-project"). */
export const slugify = (value: string): string => {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'tasks';
};

/**
 * Trigger a browser download of `content` as a `.md` file. Same blob →
 * object-URL → anchor approach as `api/export-tasks.ts`'s backend export;
 * duplicated (rather than imported) since that module owns the *server*
 * export and this one is a view-aware client-side export with a different
 * input shape.
 */
export const downloadMarkdownFile = (filename: string, content: string): void => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
};
