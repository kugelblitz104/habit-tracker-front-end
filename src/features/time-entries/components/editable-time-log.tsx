import type { TimeEntryRead } from '@/api';
import { parseServerDate } from '@/lib/date-utils';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteTimeEntry } from '../api/delete-time-entries';
import { useUpdateTimeEntry } from '../api/update-time-entries';
import { formatHumanDuration } from '../utils/format-duration';

type EditableTimeLogProps = {
    entries: TimeEntryRead[];
    /** Fallback title when an entry has no label (e.g. the task/project name). */
    contextNameFor?: (entry: TimeEntryRead) => string | null;
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

/** Server datetime -> value for <input type="datetime-local"> (local wall time). */
const toLocalInput = (value: string): string => {
    const d = parseServerDate(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
};

/** datetime-local value (local wall time) -> ISO (UTC) for the API. */
const fromLocalInput = (local: string): string | null => {
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
 * Inline editor revealed when a time entry is clicked. Label, start and end are
 * editable; duration is two-way with them — editing start or end recomputes the
 * duration (server-side), and editing duration moves the end time relative to
 * the start.
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

    // Resync from the entry after any invalidation (start/end/duration are
    // interdependent, so a change to one refreshes the others).
    useEffect(() => {
        setLabel(entry.label ?? '');
        setStart(toLocalInput(entry.started_at));
        setEnd(entry.ended_at ? toLocalInput(entry.ended_at) : '');
        setMinutes(
            entry.duration_seconds != null ? String(Math.round(entry.duration_seconds / 60)) : ''
        );
    }, [entry.label, entry.started_at, entry.ended_at, entry.duration_seconds]);

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
        <div className='mt-1.5 flex flex-col gap-1.5'>
            <div className='flex items-center gap-2'>
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
                <>
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
                    <label className='flex items-center gap-2'>
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
                </>
            )}
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
    showDate
}: {
    entry: TimeEntryRead;
    /** Label or context name; null when there's neither. */
    primary: string | null;
    showDate: boolean;
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
                    {primary && (
                        <div className='mt-0.5 font-mono text-[11px] text-text-faint'>
                            {dateTime}
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
export const EditableTimeLog = ({ entries, contextNameFor }: EditableTimeLogProps) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const primaryFor = (entry: TimeEntryRead): string | null =>
        entry.label?.trim() || contextNameFor?.(entry) || null;

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
                        />
                    );
                }
                const open = expanded.has(group.key);
                const first = group.entries[0]!;
                // With a label/context that's the title (date in the subline);
                // without one, the date leads.
                const heading = group.primary ?? formatDate(first.started_at);
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
                                <div className='mt-0.5 flex items-center gap-1 font-mono text-[11px] text-text-faint'>
                                    {group.primary
                                        ? `${formatDate(first.started_at)} · entries`
                                        : 'entries'}
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
