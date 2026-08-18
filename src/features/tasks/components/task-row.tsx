import type { ProjectRead, TaskRead } from '@/api';
import { sanitizeText } from '@/lib/input-sanitization';
import { useLongPress } from '@/lib/use-long-press';
import { TaskStatus, type TaskBand } from '@/types/types';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router';
import { getScheduledLabel } from '../utils/task-format';
import { formatDueColumn } from '../utils/due-column';
import { PRIORITY_LEVELS, PRIORITY_SHORT_LABELS } from '../utils/priority-config';
import { BAND_TIER } from '../utils/task-bands';
import { CardSubtaskChecklist } from './card-subtask-checklist';
import { PriorityMeter } from './priority-meter';
import { SubtaskQuickAdd } from './subtask-quick-add';
import { STATUS_META } from './status-config';
import { StatusControl } from './status-control';
import { TaskRowMeta } from './task-row-meta';
import { TaskContextMenu, type MenuPoint } from './task-context-menu/index';

export type ActiveBand = Exclude<TaskBand, 'hidden'>;

export type TaskRowProps = {
    task: TaskRead;
    band: ActiveBand;
    project?: ProjectRead;
    /** Whether to render the project pip at all. Default true; the project
     *  view (every row shares one project) passes false to hide it. The
     *  task DETAIL view is unaffected and always shows the project. */
    showProject?: boolean;
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
    /** Multi-select mode: show a selection checkbox to the left of the row. */
    selectable?: boolean;
    /** Whether this row is currently selected (only meaningful when selectable). */
    selected?: boolean;
    /** Toggle this row's selection (only meaningful when selectable). */
    onToggleSelect?: () => void;
};

/**
 * A single task rendered as a two-line row. Line 1: status control, title
 * (truncated), a fixed 80px due column, a fixed 48px priority column (bars +
 * label, label dropped below `sm`). Line 2 (`TaskRowMeta`): status pill,
 * project, subtasks, notes, external link. Row prominence (title/meta size,
 * vertical padding, left rail and background wash) comes from
 * `BAND_TIER[band]`, not from this component.
 *
 * Tapping the title selects the task for the edit detail pane/overlay (`editing`
 * highlights the selected row); tapping the meta row's "notes" affordance opens
 * a read-only notes view inline below the row. Notes and edit are independent.
 *
 * Exported for reuse by the /projects/:id view (wave 2c), which renders the same
 * grouped bands scoped to a project.
 */
export const TaskRow = ({
    task,
    band,
    project,
    showProject = true,
    onStatusChange,
    notesOpen,
    editing,
    onToggleNotes,
    onSelectEdit,
    subtasksOpen,
    onToggleSubtasks,
    onStartTimer,
    openUpward,
    selectable = false,
    selected = false,
    onToggleSelect
}: TaskRowProps) => {
    const { pathname } = useLocation();
    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const statusMeta = STATUS_META[status];
    const isCancelled = status === TaskStatus.CANCELLED;
    const scheduledLabel = getScheduledLabel(task.scheduled_date, task.scheduled_time);
    const hasNotes = !!task.notes && task.notes.trim().length > 0;

    // Subtask progress ("2/5"): counts come computed on every TaskRead.
    const subtaskCount = task.subtask_count ?? 0;
    const subtaskDoneCount = task.subtask_done_count ?? 0;

    // Merge extra context into the status pill so a word isn't shown twice:
    // a blocked task with a reason reads "blocked · <reason>", and a scheduled
    // task folds its date/time in as "scheduled · Jul 17th · 1:00a" (both
    // truncated). Scheduling only appears on the row when the task is Scheduled.
    const blockReason = task.block_reason?.trim();
    const showBlockedReason = status === TaskStatus.BLOCKED && !!blockReason;
    const isScheduled = status === TaskStatus.SCHEDULED;
    const pillLabel = showBlockedReason
        ? `${statusMeta.label.toLowerCase()} · ${blockReason}`
        : isScheduled && scheduledLabel
          ? scheduledLabel
          : statusMeta.label.toLowerCase();

    const tier = BAND_TIER[band];
    const due = formatDueColumn(task.due_date, task.due_time);
    const priority = task.priority ?? 0;
    const priorityLabel = PRIORITY_SHORT_LABELS[priority] ?? '';
    const isDone = status === TaskStatus.DONE || isCancelled;
    const showNotesPanel = notesOpen && hasNotes;
    const showSubtasksPanel = !!subtasksOpen && !!onToggleSubtasks && subtaskCount > 0;

    // Context menu — opened by right-click (desktop) or long-press (touch) at
    // the pointer/touch position. Rendered only while open so its project fetch
    // and dismissal listeners exist only then.
    const [menuPoint, setMenuPoint] = useState<MenuPoint | null>(null);
    const closeMenu = useCallback(() => setMenuPoint(null), []);
    // Inline "add subtask" quick-entry popover, opened from the context menu at
    // the same cursor point.
    const [subtaskAddPoint, setSubtaskAddPoint] = useState<MenuPoint | null>(null);

    // Completing / cancelling from the list "ejects" the row like a jenga block:
    // it slides out sideways while its height collapses so the rows below settle
    // up, THEN the real status change fires (which drops it from the active list
    // on refetch). Any other status change applies immediately.
    const [exiting, setExiting] = useState(false);
    const exitTimerRef = useRef<number | null>(null);
    useEffect(
        () => () => {
            if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
        },
        []
    );
    const handleStatusSelect = useCallback(
        (next: TaskStatus) => {
            const closing = next === TaskStatus.DONE || next === TaskStatus.CANCELLED;
            const reduceMotion =
                typeof window !== 'undefined' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!closing || exiting || reduceMotion) {
                onStatusChange(next);
                return;
            }
            setExiting(true);
            exitTimerRef.current = window.setTimeout(() => onStatusChange(next), 320);
        },
        [exiting, onStatusChange]
    );

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

    // Keyboard shortcuts while focus is anywhere on the row (e.g. the title
    // button): e = edit, x = toggle done, s = start timer. Ignored when typing
    // in a field within the row or with a modifier held, so it never eats real
    // input or browser shortcuts.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const target = e.target as HTMLElement;
        if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
            return;
        }
        switch (e.key.toLowerCase()) {
            case 'e':
                e.preventDefault();
                onSelectEdit(true);
                break;
            case 'x':
                e.preventDefault();
                handleStatusSelect(status === TaskStatus.DONE ? TaskStatus.OPEN : TaskStatus.DONE);
                break;
            case 's':
                if (onStartTimer) {
                    e.preventDefault();
                    onStartTimer();
                }
                break;
        }
    };

    return (
        // Eject wrapper: the grid row collapses 1fr -> 0fr (rows below settle up)
        // while the inner slides out sideways. `overflow-hidden` is only applied
        // mid-eject so it never clips the row's focus ring / editing accent at
        // rest. The explicit minmax(0,1fr) column is load-bearing: an implicit
        // `auto` track floors at the row's min-content width, which for a nowrap
        // (truncate) title is the WHOLE title, so the row would then overhang
        // the content column and scroll the page sideways on mobile instead of
        // the title truncating.
        <div
            className={`grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-300 ease-out ${
                exiting ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
            }`}
        >
            <div className={exiting ? 'overflow-hidden' : undefined}>
                <div
                    className={`transition duration-300 ease-in ${
                        exiting ? 'translate-x-[110%] opacity-0' : ''
                    }`}
                >
                    <div
                        onKeyDown={handleKeyDown}
                        // Suppress the BROWSER context menu on task rows only, showing ours
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
                            if (touch)
                                touchPointRef.current = { x: touch.clientX, y: touch.clientY };
                            longPressHandlers.onTouchStart(e);
                        }}
                        onTouchMove={longPressHandlers.onTouchMove}
                        onTouchEnd={longPressHandlers.onTouchEnd}
                        // Wash and rail sit here, not on the clickable row below, so both run
                        // the full height of the block including any expanded notes/subtask
                        // panel. The rail is the band (Whenever's is transparent, which still
                        // reserves the 3px so every band's content starts at the same x),
                        // overridden by the ONE row open in the detail pane; multi-select never
                        // lights it, or it would stop meaning "one". It is a left border rather
                        // than a ring around the row because the list container is
                        // `rounded-card overflow-hidden`, which slices a ring's corners off on
                        // the first and last rows.
                        //
                        // The fills go through custom properties rather than an inline
                        // `backgroundColor`, which would outrank the hover class and leave the
                        // washed Now rows with no hover state at all.
                        className='border-l-[3px] bg-[var(--row-bg)] transition-colors hover:bg-[var(--row-bg-hover)]'
                        style={
                            {
                                borderLeftColor: editing ? 'var(--color-now-accent)' : tier.rail,
                                '--row-bg': editing ? 'var(--surface-row-selected)' : tier.wash,
                                '--row-bg-hover': editing
                                    ? 'var(--surface-row-selected)'
                                    : 'var(--surface-row-hover)'
                            } as CSSProperties
                        }
                    >
                        <div
                            onClick={() => onSelectEdit()}
                            className='flex cursor-pointer items-start gap-[10px] pr-[14px] pl-[10px]'
                        >
                            {/* Both controls: the row's padY on the outer box so they start level
                                with the title column, then `controlBox` centres them on line 1's
                                line box. The two cannot share one element, since `h-` counts
                                padding under border-box. */}
                            {selectable && (
                                <div className={tier.padY}>
                                    <div className={tier.controlBox}>
                                        <input
                                            type='checkbox'
                                            checked={selected}
                                            onChange={onToggleSelect}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`Select task: ${task.title}`}
                                            className='h-4 w-4 cursor-pointer accent-[var(--color-now-accent)]'
                                        />
                                    </div>
                                </div>
                            )}

                            <div className={tier.padY}>
                                <div className={tier.controlBox}>
                                    <StatusControl
                                        status={status}
                                        onSelect={handleStatusSelect}
                                        band={band}
                                        openUpward={openUpward}
                                    />
                                </div>
                            </div>

                            <div className={`min-w-0 flex-1 ${tier.padY}`}>
                                <div className='flex items-baseline gap-[10px]'>
                                    <button
                                        type='button'
                                        onClick={(e) => {
                                            // The row itself now also opens the detail (below); stop
                                            // here so a title click doesn't fire onSelectEdit twice
                                            // in one event, which would toggle it open then closed.
                                            e.stopPropagation();
                                            onSelectEdit();
                                        }}
                                        aria-pressed={editing}
                                        aria-label={`${task.title}${due ? `, ${due.text}` : ''}${
                                            !isDone && priorityLabel
                                                ? `, ${priorityLabel} priority`
                                                : ''
                                        }`}
                                        // The focus ring lives on the title, not on the row: the
                                        // list container clips a full-row ring's corners.
                                        className={`min-w-0 flex-1 truncate rounded-[4px] text-left font-display leading-snug outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-now-accent ${
                                            tier.title
                                        } ${isDone ? 'text-text-muted line-through' : ''}`}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </button>

                                    {/* Fixed-width track so the chip's RIGHT edge lines up down
                                        the list whatever its text; the chip itself only shows a
                                        fill when the date is overdue or imminent. */}
                                    <span className='flex w-[80px] shrink-0 justify-end'>
                                        {due && (
                                            <span
                                                className='rounded-chip px-[6px] py-[1px] font-mono text-[12px]'
                                                style={due.style}
                                            >
                                                {due.text}
                                            </span>
                                        )}
                                    </span>

                                    {!isDone && (
                                        // Below sm the bars stay and only the LABEL is dropped: the
                                        // title carries band, not priority, so hiding the whole column
                                        // would leave priority visible nowhere on a phone.
                                        <span
                                            className='flex w-[20px] shrink-0 items-center justify-end gap-[5px] font-mono text-[12px] sm:w-[48px]'
                                            style={PRIORITY_LEVELS[priority]?.labelStyle}
                                        >
                                            {/* No meter at priority 0: an empty one on most rows
                                                is noise, and the blank column already says none. */}
                                            {priority > 0 && <PriorityMeter priority={priority} />}
                                            <span className='hidden sm:inline'>
                                                {priorityLabel}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                <TaskRowMeta
                                    task={task}
                                    project={project}
                                    showProject={showProject}
                                    pathname={pathname}
                                    statusMeta={statusMeta}
                                    status={status}
                                    pillLabel={pillLabel}
                                    metaClass={isDone ? 'text-text-muted' : tier.meta}
                                    subtaskCount={subtaskCount}
                                    subtaskDoneCount={subtaskDoneCount}
                                    subtasksOpen={subtasksOpen}
                                    onToggleSubtasks={onToggleSubtasks}
                                    hasNotes={hasNotes}
                                    notesOpen={notesOpen}
                                    onToggleNotes={onToggleNotes}
                                />
                            </div>
                        </div>

                        {/* Expanded panels. Indented to the title's left edge and inset from
                            the card's right, so they read as belonging to this row rather than
                            spanning the whole list container. */}
                        {(showNotesPanel || showSubtasksPanel) && (
                            <div className={`${tier.panelIndent} pr-[14px] pb-[12px]`}>
                                {/* Read-only notes view, opened by the meta-row "notes" chip.
                                    Mirrors the project-notes rendering: sanitized,
                                    whitespace-preserved, mono/secondary. */}
                                {showNotesPanel && (
                                    <div
                                        className='mt-2 rounded-button border p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-text-secondary-soft'
                                        style={{
                                            backgroundColor: 'var(--surface-input-bg)',
                                            borderColor: 'var(--surface-input-border)'
                                        }}
                                    >
                                        {sanitizeText(task.notes ?? '')}
                                    </div>
                                )}

                                {/* Subtask quick-clear checklist, opened by the subtask chip. */}
                                {showSubtasksPanel && (
                                    <CardSubtaskChecklist
                                        profileId={task.profile_id}
                                        parentId={task.id}
                                    />
                                )}
                            </div>
                        )}

                        {menuPoint && (
                            <TaskContextMenu
                                task={task}
                                point={menuPoint}
                                onClose={closeMenu}
                                onStatusChange={handleStatusSelect}
                                onSelectEdit={onSelectEdit}
                                editing={editing}
                                onStartTimer={onStartTimer}
                                onAddSubtask={
                                    task.parent_id == null
                                        ? () => setSubtaskAddPoint(menuPoint)
                                        : undefined
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
                </div>
            </div>
        </div>
    );
};
