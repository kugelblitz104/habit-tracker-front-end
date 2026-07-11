import type { ProjectRead, TaskRead } from '@/api';
import { sanitizeText } from '@/lib/input-sanitization';
import { useLongPress } from '@/lib/use-long-press';
import { TaskStatus, type TaskBand } from '@/types/types';
import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { getDueInfo, getScheduledLabel } from '../utils/task-format';
import { CardSubtaskChecklist } from './card-subtask-checklist';
import { PriorityMeter } from './priority-meter';
import { SubtaskQuickAdd } from './subtask-quick-add';
import { STATUS_META } from './status-config';
import { StatusControl } from './status-control';
import { TaskCardMetaRow } from './task-card-meta-row';
import { TaskContextMenu, type MenuPoint } from './task-context-menu';

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
    /** Open this task's detail (title click = view; pass true for edit). */
    onSelectEdit: (editing?: boolean) => void;
    /** Whether the inline subtask quick-clear checklist is open. */
    subtasksOpen?: boolean;
    /** Toggle the subtask quick-clear checklist (subtask chip). */
    onToggleSubtasks?: () => void;
    /** Start a timer attached to this task (from the context menu). */
    onStartTimer?: () => void;
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
        // px-3 matches Soon's horizontal inset so the status control + title
        // line up with the Soon / Needs-attention cards above (was flush-left).
        container: 'border-b px-3 py-2',
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
    subtasksOpen,
    onToggleSubtasks,
    onStartTimer,
    openUpward
}: TaskCardProps) => {
    const { pathname } = useLocation();
    const style = BAND_STYLE[band];
    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const statusMeta = STATUS_META[status];
    const isCancelled = status === TaskStatus.CANCELLED;
    const due = getDueInfo(task.due_date);
    const scheduledLabel = getScheduledLabel(task.scheduled_date, task.scheduled_time);
    const hasNotes = !!task.notes && task.notes.trim().length > 0;

    // Subtask progress ("2/5") — counts come computed on every TaskRead. When
    // every subtask is done the chip picks up the Done pill's success tones.
    const subtaskCount = task.subtask_count ?? 0;
    const subtaskDoneCount = task.subtask_done_count ?? 0;
    const allSubtasksDone = subtaskCount > 0 && subtaskDoneCount === subtaskCount;

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

    // Context menu — opened by right-click (desktop) or long-press (touch) at
    // the pointer/touch position. Rendered only while open so its project fetch
    // and dismissal listeners exist only then.
    const [menuPoint, setMenuPoint] = useState<MenuPoint | null>(null);
    const closeMenu = useCallback(() => setMenuPoint(null), []);
    // Inline "add subtask" quick-entry popover, opened from the context menu at
    // the same cursor point.
    const [subtaskAddPoint, setSubtaskAddPoint] = useState<MenuPoint | null>(null);

    // Swallow the click that trails a long-press so it can't also fire the
    // title's edit action (or a menu item that lands under the finger).
    const swallowNextClick = () => {
        const swallow = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            cleanup();
        };
        const cleanup = () => {
            document.removeEventListener('click', swallow, true);
            window.clearTimeout(timer);
        };
        document.addEventListener('click', swallow, true);
        const timer = window.setTimeout(cleanup, 500);
    };

    // Long-press → same menu on touch devices; reuses the tracker cells'
    // useLongPress pattern (default 500ms / 10px move threshold).
    const touchPointRef = useRef<MenuPoint | null>(null);
    const longPressHandlers = useLongPress(() => {
        if (touchPointRef.current) {
            swallowNextClick();
            setMenuPoint(touchPointRef.current);
        }
    });

    return (
        <div
            className={style.container}
            style={containerStyle}
            // Suppress the BROWSER context menu on task cards only, showing ours
            // instead. (Android also routes native long-press through here.)
            onContextMenu={(e) => {
                e.preventDefault();
                setMenuPoint({ x: e.clientX, y: e.clientY });
            }}
            onTouchStart={(e) => {
                // Portal events bubble through the React tree — don't restart a
                // long-press from touches on the open menu itself.
                if (menuPoint) return;
                const touch = e.touches[0];
                if (touch) touchPointRef.current = { x: touch.clientX, y: touch.clientY };
                longPressHandlers.onTouchStart(e);
            }}
            onTouchMove={longPressHandlers.onTouchMove}
            onTouchEnd={longPressHandlers.onTouchEnd}
        >
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
                        onClick={() => onSelectEdit()}
                        aria-pressed={editing}
                        className={`block w-full truncate text-left font-display hover:opacity-90 ${
                            style.title
                        } ${isCancelled ? 'line-through' : ''}`}
                        title={task.title}
                    >
                        {task.title}
                    </button>

                    {/* Meta row — always directly beneath the title, left-aligned. */}
                    <TaskCardMetaRow
                        task={task}
                        project={project}
                        pathname={pathname}
                        statusMeta={statusMeta}
                        status={status}
                        pillLabel={pillLabel}
                        due={due}
                        subtaskCount={subtaskCount}
                        subtaskDoneCount={subtaskDoneCount}
                        allSubtasksDone={allSubtasksDone}
                        subtasksOpen={subtasksOpen}
                        onToggleSubtasks={onToggleSubtasks}
                        hasNotes={hasNotes}
                        notesOpen={notesOpen}
                        onToggleNotes={onToggleNotes}
                    />
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

            {/* Subtask quick-clear checklist — opened by the subtask chip. */}
            {subtasksOpen && onToggleSubtasks && subtaskCount > 0 && (
                <CardSubtaskChecklist profileId={task.profile_id} parentId={task.id} />
            )}

            {menuPoint && (
                <TaskContextMenu
                    task={task}
                    point={menuPoint}
                    onClose={closeMenu}
                    onStatusChange={onStatusChange}
                    onSelectEdit={onSelectEdit}
                    editing={editing}
                    onStartTimer={onStartTimer}
                    onAddSubtask={
                        task.parent_id == null ? () => setSubtaskAddPoint(menuPoint) : undefined
                    }
                />
            )}

            {subtaskAddPoint && (
                <SubtaskQuickAdd
                    profileId={task.profile_id}
                    parentId={task.id}
                    point={subtaskAddPoint}
                    onClose={() => setSubtaskAddPoint(null)}
                />
            )}
        </div>
    );
};
