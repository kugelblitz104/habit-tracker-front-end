import type { ProjectRead, TaskRead } from '@/api';
import { sanitizeText } from '@/lib/input-sanitization';
import { TaskStatus, type TaskBand } from '@/types/types';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { getDueInfo, getScheduledLabel } from '../utils/task-format';
import { PriorityMeter } from './priority-meter';
import { STATUS_META } from './status-config';
import { StatusControl } from './status-control';

export type ActiveBand = Exclude<TaskBand, 'hidden'>;

export type TaskCardProps = {
    task: TaskRead;
    band: ActiveBand;
    project?: ProjectRead;
    onStatusChange: (status: TaskStatus) => void;
    /** Whether the inline read-only notes panel is open. */
    notesOpen: boolean;
    /** Whether this task is the one loaded in the edit detail pane/overlay. */
    editing: boolean;
    /** Toggle the read-only notes panel (meta-row "notes" chip). */
    onToggleNotes: () => void;
    /** Select this task for the edit detail pane/overlay (title click). */
    onSelectEdit: () => void;
    /** Prefer opening the status picker upward (last rows of a band). */
    openUpward?: boolean;
};

type BandStyle = {
    container: string;
    containerStyle?: React.CSSProperties;
    title: string;
};

const BAND_STYLE: Record<ActiveBand, BandStyle> = {
    now: {
        container: 'rounded-card border p-4 shadow-now-glow',
        containerStyle: {
            background: 'var(--now-gradient-primary)',
            borderColor: 'var(--now-border)',
            boxShadow: 'var(--now-glow)'
        },
        title: 'text-[20px] font-semibold leading-snug text-text-now'
    },
    soon: {
        container: 'rounded-row border p-3',
        containerStyle: {
            backgroundColor: 'var(--color-soon-surface)',
            borderColor: 'var(--soon-border)'
        },
        title: 'text-[15.5px] font-medium leading-snug text-text-secondary'
    },
    whenever: {
        container: 'border-b py-2',
        containerStyle: { borderColor: 'var(--color-whenever-ring)' },
        title: 'text-[14px] font-normal leading-snug text-whenever-text'
    }
};

/**
 * A single task rendered per-band. Anatomy (left → right): round status control,
 * body (title + a meta row DIRECTLY beneath — project tag, status pill (which
 * folds in the block reason or, when Scheduled, the scheduled date/time), due
 * chip, notes affordance — chips never pushed right), priority meter far right.
 *
 * Tapping the title selects the task for the edit detail pane/overlay (`editing`
 * highlights the selected card); tapping the meta-row "notes" chip opens a
 * read-only notes view inline below the row. Notes and edit are independent.
 *
 * Exported for reuse by the /projects/:id view (wave 2c), which renders the same
 * grouped bands scoped to a project.
 */
export const TaskCard = ({
    task,
    band,
    project,
    onStatusChange,
    notesOpen,
    editing,
    onToggleNotes,
    onSelectEdit,
    openUpward
}: TaskCardProps) => {
    const style = BAND_STYLE[band];
    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const statusMeta = STATUS_META[status];
    const isCancelled = status === TaskStatus.CANCELLED;
    const due = getDueInfo(task.due_date);
    const scheduledLabel = getScheduledLabel(task.scheduled_date, task.scheduled_time);
    const hasNotes = !!task.notes && task.notes.trim().length > 0;

    // Merge extra context into the status pill so a word isn't shown twice:
    // a blocked task with a reason reads "blocked · <reason>", and a scheduled
    // task folds its date/time in as "scheduled · Jul 17th · 1:00a" (both
    // truncated). Scheduling only appears on the card when the task is Scheduled.
    const blockReason = task.block_reason?.trim();
    const showBlockedReason = status === TaskStatus.BLOCKED && !!blockReason;
    const isScheduled = status === TaskStatus.SCHEDULED;
    const pillLabel = showBlockedReason
        ? `${statusMeta.label.toLowerCase()} · ${blockReason}`
        : isScheduled && scheduledLabel
          ? scheduledLabel
          : statusMeta.label.toLowerCase();

    const containerStyle: React.CSSProperties = editing
        ? {
              ...style.containerStyle,
              outline: '1px solid var(--color-now-accent)',
              outlineOffset: '2px'
          }
        : style.containerStyle ?? {};

    return (
        <div className={style.container} style={containerStyle}>
            <div className='flex items-start gap-3'>
                <div className='pt-0.5'>
                    <StatusControl
                        status={status}
                        onSelect={onStatusChange}
                        band={band}
                        openUpward={openUpward}
                    />
                </div>

                <div className='min-w-0 flex-1'>
                    <button
                        type='button'
                        onClick={onSelectEdit}
                        aria-pressed={editing}
                        className={`block w-full truncate text-left font-display hover:opacity-90 ${
                            style.title
                        } ${isCancelled ? 'line-through' : ''}`}
                        title={task.title}
                    >
                        {task.title}
                    </button>

                    {/* Meta row — always directly beneath the title, left-aligned. */}
                    <div className='mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]'>
                        {project && (
                            <Link
                                to={`/projects/${project.id}`}
                                className='inline-flex items-center gap-1.5 text-text-muted hover:text-text-secondary'
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span
                                    className='inline-block h-2 w-2 rounded-full'
                                    style={{ backgroundColor: project.color }}
                                />
                                {project.name}
                            </Link>
                        )}

                        {statusMeta.pillText && statusMeta.pillBg && (
                            <span
                                className='inline-block max-w-[220px] truncate rounded-chip px-2 py-0.5 align-bottom'
                                style={{
                                    color: statusMeta.pillText,
                                    backgroundColor: statusMeta.pillBg
                                }}
                                title={pillLabel}
                            >
                                {pillLabel}
                            </span>
                        )}

                        {due && (
                            <span
                                className='rounded-chip px-2 py-0.5'
                                style={
                                    due.hot
                                        ? {
                                              color: 'var(--color-status-duetoday)',
                                              backgroundColor: 'var(--status-duetoday-bg)'
                                          }
                                        : { color: 'var(--color-text-muted)' }
                                }
                            >
                                {due.label}
                            </span>
                        )}

                        {task.external_ref && task.external_url && (
                            <a
                                href={task.external_url}
                                target='_blank'
                                rel='noreferrer'
                                onClick={(e) => e.stopPropagation()}
                                className='rounded-chip px-2 py-0.5'
                                style={{
                                    color: 'var(--color-azure-text)',
                                    backgroundColor: 'var(--azure-bg)',
                                    border: '1px solid var(--azure-border)'
                                }}
                            >
                                {task.external_ref} ↗
                            </a>
                        )}

                        {hasNotes && (
                            <button
                                type='button'
                                onClick={onToggleNotes}
                                aria-expanded={notesOpen}
                                className='inline-flex items-center gap-0.5 text-text-faint hover:text-text-muted'
                            >
                                notes
                                <ChevronRight
                                    size={12}
                                    className={`transition-transform ${
                                        notesOpen ? 'rotate-90' : ''
                                    }`}
                                />
                            </button>
                        )}
                    </div>
                </div>

                <div className='pt-1.5'>
                    <PriorityMeter priority={task.priority ?? 0} band={band} />
                </div>
            </div>

            {/* Read-only notes view — opened by the meta-row "notes" chip. Mirrors the
                project-notes rendering: sanitized, whitespace-preserved, mono/secondary. */}
            {notesOpen && hasNotes && (
                <div
                    className='mt-3 rounded-button border p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-text-secondary-soft'
                    style={{
                        backgroundColor: 'var(--surface-input-bg)',
                        borderColor: 'var(--surface-input-border)'
                    }}
                >
                    {sanitizeText(task.notes ?? '')}
                </div>
            )}
        </div>
    );
};
