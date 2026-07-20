import type { TimeEntryRead } from '@/api';
import { parseServerDate } from '@/lib/date-utils';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteTimeEntry } from '../api/delete-time-entries';
import { useUpdateTimeEntry } from '../api/update-time-entries';
import type { EntryProject } from '../hooks/use-entry-project';
import { formatHumanDuration } from '../utils/format-duration';
import { ProjectSelect } from './project-select';
import { TaskSelect } from './task-select';

type EditableTimeLogProps = {
    entries: TimeEntryRead[];
    /** Fallback title when an entry has no label (e.g. the task/project name). */
    contextNameFor?: (entry: TimeEntryRead) => string | null;
    /** Resolves an entry's associated project (task's parent project, or the
     *  adhoc project it's attached to) — only consulted when `showProject`. */
    projectFor?: (entry: TimeEntryRead) => EntryProject | null;
    /** Render a small colored project "pip" on each row. Off by default —
     *  the task/project detail logs don't need it; only the timer page's
     *  RecentEntries opts in. */
    showProject?: boolean;
};

const localDateKey = (value: string): string => {
    const d = parseServerDate(value);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Year-less date, e.g. "Jul 10". */
const formatDate = (value: string): string =>
    parseServerDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Time of day, e.g. "1:55 PM". */
const formatTime = (value: string): string =>
    parseServerDate(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const pad = (n: number) => String(n).padStart(2, '0');

/** Server datetime -> value for <input type="datetime-local"> (local wall time).
 *  Exported so ManualEntryForm's start/end inputs share the same round-trip. */
export const toLocalInput = (value: string): string => {
    const d = parseServerDate(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
};

/** datetime-local value (local wall time) -> ISO (UTC) for the API.
 *  Exported so ManualEntryForm sends start/end the same way EntryEditor does. */
export const fromLocalInput = (local: string): string | null => {
    if (!local) return null;
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const patchErrorMessage = (error: unknown): string =>
    (error as { body?: { detail?: string } })?.body?.detail ?? 'Failed to update entry.';

const inputClass =
    'rounded-button border px-2 py-1 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';
const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark'
};

type Group = {
    key: string;
    /** Label or context name; null when the entry has neither (date leads). */
    primary: string | null;
    entries: TimeEntryRead[];
    totalSeconds: number;
};

const fieldLabelClass =
    'w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-text-faint';

/**
 * Small secondary "pip" naming the project a row/group belongs to — bold text
 * in the project's own color, matching the task-card project tag. Subtle by
 * design: it never competes with the row's primary label/context line.
 */
const ProjectPip = ({ project }: { project: EntryProject | null | undefined }) => {
    if (!project) return null;
    return (
        <span
            className='truncate font-semibold'
            style={{ color: project.color }}
            title={project.name}
        >
            {project.name}
        </span>
    );
};

/** Which target select to show for an entry: project when it's an adhoc
 *  project-attached entry, otherwise task (covers task-attached and untethered). */
const initialTargetType = (entry: TimeEntryRead): 'task' | 'project' =>
    entry.project_id != null && entry.task_id == null ? 'project' : 'task';

/**
 * Inline editor revealed when a time entry is clicked. Label, start, end and the
 * task/project association are editable; duration is two-way with start/end —
 * editing start or end recomputes the duration (server-side), and editing
 * duration moves the end time relative to the start.
 */
const EntryEditor = ({ entry }: { entry: TimeEntryRead }) => {
    const updateEntry = useUpdateTimeEntry();
    const deleteEntry = useDeleteTimeEntry();
    const [label, setLabel] = useState(entry.label ?? '');
    const [start, setStart] = useState(toLocalInput(entry.started_at));
    const [end, setEnd] = useState(entry.ended_at ? toLocalInput(entry.ended_at) : '');
    const [minutes, setMinutes] = useState(
        entry.duration_seconds != null ? String(Math.round(entry.duration_seconds / 60)) : ''
    );
    const [targetType, setTargetType] = useState<'task' | 'project'>(initialTargetType(entry));
    const [taskId, setTaskId] = useState<number | null>(entry.task_id ?? null);
    const [projectId, setProjectId] = useState<number | null>(entry.project_id ?? null);

    // Resync from the entry after any invalidation (start/end/duration are
    // interdependent, so a change to one refreshes the others; the association
    // can change from here or elsewhere too).
    useEffect(() => {
        setLabel(entry.label ?? '');
        setStart(toLocalInput(entry.started_at));
        setEnd(entry.ended_at ? toLocalInput(entry.ended_at) : '');
        setMinutes(
            entry.duration_seconds != null ? String(Math.round(entry.duration_seconds / 60)) : ''
        );
        setTargetType(initialTargetType(entry));
        setTaskId(entry.task_id ?? null);
        setProjectId(entry.project_id ?? null);
    }, [
        entry.label,
        entry.started_at,
        entry.ended_at,
        entry.duration_seconds,
        entry.task_id,
        entry.project_id
    ]);

    const patch = (data: Record<string, unknown>) =>
        updateEntry.mutate(
            { entryId: entry.id, data },
            { onError: (error) => toast.error(patchErrorMessage(error)) }
        );

    const commitLabel = () => {
        const next = label.trim();
        if (next !== (entry.label ?? '')) patch({ label: next || null });
    };

    const commitStart = () => {
        const iso = fromLocalInput(start);
        if (iso && iso !== entry.started_at) patch({ started_at: iso });
    };

    const commitEnd = () => {
        // End drives duration; blank end on a stopped entry is ignored.
        const iso = fromLocalInput(end);
        if (iso && iso !== entry.ended_at) patch({ ended_at: iso });
    };

    const commitDuration = () => {
        if (entry.is_running) return;
        const mins = Number(minutes);
        if (!Number.isFinite(mins) || mins < 0) return;
        if (mins === Math.round((entry.duration_seconds ?? 0) / 60)) return;
        // Duration moves the END relative to the (current) start time.
        const startMs = fromLocalInput(start)
            ? new Date(fromLocalInput(start)!).getTime()
            : parseServerDate(entry.started_at).getTime();
        patch({ ended_at: new Date(startMs + mins * 60 * 1000).toISOString() });
    };

    // Association: task and project are mutually exclusive server-side (a
    // task-attached entry derives its project from the task), so setting one
    // always clears the other; clearing the selection untethers the entry.
    const commitTask = (next: number | null) => {
        setTaskId(next);
        if (next !== (entry.task_id ?? null) || entry.project_id != null)
            patch({ task_id: next, project_id: null });
    };

    const commitProject = (next: number | null) => {
        setProjectId(next);
        if (next !== (entry.project_id ?? null) || entry.task_id != null)
            patch({ project_id: next, task_id: null });
    };

    const handleDelete = () => {
        if (deleteEntry.isPending) return;
        deleteEntry.mutate(
            { entryId: entry.id, profileId: entry.profile_id },
            {
                onSuccess: () => toast.success('Entry deleted'),
                onError: () => toast.error('Failed to delete entry.')
            }
        );
    };

    return (
        <div className='mt-1.5 flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
                <span className={fieldLabelClass}>Attach</span>
                <div className='min-w-0 flex-1'>
                    {targetType === 'task' ? (
                        <TaskSelect
                            profileId={entry.profile_id}
                            value={taskId}
                            onChange={commitTask}
                            disabled={updateEntry.isPending}
                            id={`entry-task-${entry.id}`}
                        />
                    ) : (
                        <ProjectSelect
                            profileId={entry.profile_id}
                            value={projectId}
                            onChange={commitProject}
                            disabled={updateEntry.isPending}
                            id={`entry-project-${entry.id}`}
                        />
                    )}
                </div>
                <div
                    className='flex shrink-0 items-center gap-1 rounded-chip border p-0.5'
                    style={{ borderColor: 'var(--surface-input-border)' }}
                >
                    {[
                        { type: 'task' as const, label: 'Task' },
                        { type: 'project' as const, label: 'Project' }
                    ].map((option) => {
                        const selected = targetType === option.type;
                        return (
                            <button
                                key={option.type}
                                type='button'
                                onClick={() => setTargetType(option.type)}
                                aria-pressed={selected}
                                className='rounded-chip px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors'
                                style={{
                                    backgroundColor: selected
                                        ? 'rgba(255,255,255,.06)'
                                        : 'transparent',
                                    color: selected
                                        ? 'var(--color-now-accent)'
                                        : 'var(--color-text-muted)'
                                }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className='flex items-center gap-2'>
                <span className={fieldLabelClass}>Label</span>
                <input
                    type='text'
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={commitLabel}
                    placeholder='Label'
                    aria-label='Entry label'
                    className={`${inputClass} min-w-0 flex-1 placeholder:text-text-faint`}
                    style={inputStyle}
                />
                <button
                    type='button'
                    onClick={handleDelete}
                    disabled={deleteEntry.isPending}
                    aria-label='Delete entry'
                    title='Delete'
                    className='shrink-0 text-text-faint transition-colors hover:text-danger disabled:opacity-50'
                >
                    <Trash2 size={14} />
                </button>
            </div>
            <div className='flex flex-wrap items-start gap-x-3 gap-y-2'>
                <div className='flex flex-col gap-2'>
                    <label className='flex items-center gap-2'>
                        <span className={fieldLabelClass}>Start</span>
                        <input
                            type='datetime-local'
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                            onBlur={commitStart}
                            aria-label='Start time'
                            className={inputClass}
                            style={inputStyle}
                        />
                    </label>
                    {!entry.is_running && (
                        <label className='flex items-center gap-2'>
                            <span className={fieldLabelClass}>End</span>
                            <input
                                type='datetime-local'
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                onBlur={commitEnd}
                                aria-label='End time'
                                className={inputClass}
                                style={inputStyle}
                            />
                        </label>
                    )}
                </div>
                {!entry.is_running && (
                    <label className='flex shrink-0 items-center gap-2'>
                        <span className={fieldLabelClass}>Duration</span>
                        <input
                            type='number'
                            min={0}
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            onBlur={commitDuration}
                            aria-label='Duration in minutes'
                            className={`${inputClass} w-20`}
                            style={inputStyle}
                        />
                        <span className='font-mono text-[11px] text-text-faint'>min</span>
                    </label>
                )}
            </div>
        </div>
    );
};

/**
 * A single entry: a click-to-edit row. When the entry has a label/context that's
 * the title with date·time beneath; with neither, the date·time becomes the
 * title (no empty label line). Duration always sits on the right.
 */
const EntryRow = ({
    entry,
    primary,
    showDate,
    project
}: {
    entry: TimeEntryRead;
    /** Label or context name; null when there's neither. */
    primary: string | null;
    showDate: boolean;
    /** The entry's project pip; undefined/null renders nothing. */
    project?: EntryProject | null;
}) => {
    const [editing, setEditing] = useState(false);
    const dateTime = [showDate ? formatDate(entry.started_at) : null, formatTime(entry.started_at)]
        .filter(Boolean)
        .join(' · ');
    const duration = entry.is_running
        ? 'running'
        : formatHumanDuration(entry.duration_seconds ?? 0);

    return (
        <div
            className='border-t py-2 first:border-t-0'
            style={{ borderColor: 'rgba(255,255,255,.06)' }}
        >
            <button
                type='button'
                onClick={() => setEditing((v) => !v)}
                aria-expanded={editing}
                className='flex w-full items-center gap-2 text-left'
            >
                <div className='min-w-0 flex-1'>
                    <div className='truncate font-display text-[13px] text-text-secondary'>
                        {primary ?? dateTime}
                    </div>
                    {(primary || project) && (
                        <div className='mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-text-faint'>
                            {primary && <span>{dateTime}</span>}
                            <ProjectPip project={project} />
                        </div>
                    )}
                </div>
                <span className='shrink-0 font-mono text-[11.5px] tabular-nums text-text-secondary'>
                    {duration}
                </span>
            </button>
            {editing && <EntryEditor entry={entry} />}
        </div>
    );
};

/**
 * Editable, date-grouped time log shared by the task view, timer screen and
 * project view. Entries with the same label on the same day collapse into one
 * group with a count and an "entries" expander; a single entry renders as a
 * click-to-edit row. Clicking an entry reveals its label + duration editor.
 */
export const EditableTimeLog = ({
    entries,
    contextNameFor,
    projectFor,
    showProject = false
}: EditableTimeLogProps) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const primaryFor = (entry: TimeEntryRead): string | null =>
        entry.label?.trim() || contextNameFor?.(entry) || null;

    // Resolved lazily per row/group — undefined (not called) when the caller
    // doesn't opt in, so task/project detail logs pay nothing extra.
    const projectOf = (entry: TimeEntryRead): EntryProject | null =>
        showProject ? projectFor?.(entry) ?? null : null;

    const groups = useMemo<Group[]>(() => {
        const map = new Map<string, Group>();
        for (const entry of entries) {
            const primary = primaryFor(entry);
            const key = `${localDateKey(entry.started_at)}|${primary ?? ''}`;
            const group = map.get(key);
            if (group) {
                group.entries.push(entry);
                group.totalSeconds += entry.duration_seconds ?? 0;
            } else {
                map.set(key, {
                    key,
                    primary,
                    entries: [entry],
                    totalSeconds: entry.duration_seconds ?? 0
                });
            }
        }
        return [...map.values()];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entries]);

    return (
        <div>
            {groups.map((group) => {
                if (group.entries.length === 1) {
                    return (
                        <EntryRow
                            key={group.key}
                            entry={group.entries[0]!}
                            primary={group.primary}
                            showDate
                            project={projectOf(group.entries[0]!)}
                        />
                    );
                }
                const open = expanded.has(group.key);
                const first = group.entries[0]!;
                // With a label/context that's the title (date in the subline);
                // without one, the date leads. The group's entries share a
                // label/date, so its first entry's project stands in for the
                // whole group.
                const heading = group.primary ?? formatDate(first.started_at);
                const groupProject = projectOf(first);
                return (
                    <div
                        key={group.key}
                        className='border-t py-2 first:border-t-0'
                        style={{ borderColor: 'rgba(255,255,255,.06)' }}
                    >
                        <button
                            type='button'
                            onClick={() =>
                                setExpanded((prev) => {
                                    const next = new Set(prev);
                                    next.has(group.key)
                                        ? next.delete(group.key)
                                        : next.add(group.key);
                                    return next;
                                })
                            }
                            aria-expanded={open}
                            className='flex w-full items-center gap-2 text-left'
                        >
                            <span
                                className='inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-chip px-1 font-mono text-[10.5px] text-text-secondary'
                                style={{ backgroundColor: 'rgba(255,255,255,.06)' }}
                            >
                                {group.entries.length}
                            </span>
                            <div className='min-w-0 flex-1'>
                                <div className='truncate font-display text-[13px] text-text-secondary'>
                                    {heading}
                                </div>
                                <div className='mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-text-faint'>
                                    <span>
                                        {group.primary
                                            ? `${formatDate(first.started_at)} · entries`
                                            : 'entries'}
                                    </span>
                                    <ProjectPip project={groupProject} />
                                    <ChevronRight
                                        size={12}
                                        className={`transition-transform ${
                                            open ? 'rotate-90' : ''
                                        }`}
                                    />
                                </div>
                            </div>
                            <span className='shrink-0 font-mono text-[11.5px] tabular-nums text-text-secondary'>
                                {formatHumanDuration(group.totalSeconds)}
                            </span>
                        </button>
                        {open && (
                            <div className='mt-1 pl-7'>
                                {group.entries.map((entry) => (
                                    <EntryRow
                                        key={entry.id}
                                        entry={entry}
                                        primary={null}
                                        showDate={false}
                                        project={projectOf(entry)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
