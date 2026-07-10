import type { TaskRead, TaskUpdate } from '@/api';
import { useProjects } from '@/features/projects/api/get-projects';
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';
import { Check, ChevronLeft, ChevronRight, ListPlus, Pencil, Timer, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router';
import { toast } from 'react-toastify';
import { useDeleteTask } from '../api/delete-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { formatShortDate } from '../utils/task-format';
import { STATUS_META, STATUS_ORDER } from './status-config';
import { StatusGlyph } from './status-glyph';

export type MenuPoint = { x: number; y: number };

type TaskContextMenuProps = {
    task: TaskRead;
    /** Viewport (client) coordinates the menu opens at — cursor or touch point. */
    point: MenuPoint;
    onClose: () => void;
    /**
     * Same handler the card's round status picker uses, so toast behavior stays
     * identical per surface (Today toasts done/cancelled; project view is quiet).
     */
    onStatusChange: (status: TaskStatus) => void;
    /**
     * Open the task detail (pane on wide screens, `/tasks/:id` on narrow).
     * Pass `true` to open straight into the edit form.
     */
    onSelectEdit: (editing?: boolean) => void;
    /** Editor already open for this task — skip selectEdit's toggle-close. */
    editing: boolean;
    /** Start a timer attached to this task (omit to hide the action). */
    onStartTimer?: () => void;
    /** Open the inline quick-add subtask popover (omit to fall back to the editor). */
    onAddSubtask?: () => void;
};

type MenuView = 'root' | 'status' | 'priority' | 'project' | 'due' | 'scheduled';

/** Mirrors the PriorityField accent ramp (task-form-fields) without importing it. */
const PRIORITY_LEVELS = [
    { value: 0, label: 'None', accent: 'var(--color-text-faint)' },
    { value: 1, label: 'Low', accent: 'var(--color-whenever-text)' },
    { value: 2, label: 'Medium', accent: 'var(--color-soon-meter)' },
    { value: 3, label: 'High', accent: 'var(--color-now-meter)' }
] as const;

const DATE_QUICK_SETS = [
    { label: 'Today', offset: 0 },
    { label: 'Tomorrow', offset: 1 },
    { label: 'Next week', offset: 7 }
] as const;

const quickDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return toLocalDateString(d);
};

const itemClass =
    'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left font-display text-[13px] hover:bg-white/5';

const dateInputClass =
    'w-full rounded-button border px-2 py-1 font-mono text-[12px] text-text-secondary outline-none focus-visible:ring-1 focus-visible:ring-now-accent';

const dateInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark'
};

const CURRENT_BG = 'rgba(255,255,255,0.05)';

const Divider = () => (
    <div className='my-1 border-t' style={{ borderColor: 'var(--surface-card-border)' }} />
);

/** Submenu header: uppercase mono label that navigates back to the root view. */
const SubHeader = ({ label, onBack }: { label: string; onBack: () => void }) => (
    <button
        type='button'
        onClick={onBack}
        className='flex w-full items-center gap-1 rounded-[6px] px-2 py-1.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint hover:bg-white/5'
    >
        <ChevronLeft size={12} />
        {label}
    </button>
);

/** Root row that drills into a submenu; shows the current value as a hint. */
const RootRow = ({
    label,
    hint,
    onClick
}: {
    label: string;
    hint: string;
    onClick: () => void;
}) => (
    <button type='button' onClick={onClick} className={itemClass}>
        <span className='text-text-secondary'>{label}</span>
        <span className='ml-auto max-w-[104px] truncate font-mono text-[10.5px] text-text-faint'>
            {hint}
        </span>
        <ChevronRight size={13} className='shrink-0 text-text-muted' />
    </button>
);

/**
 * Right-click / long-press context menu for a task card. A small controlled
 * popover portalled to <body> at the cursor point (clamped to the viewport),
 * styled like the app's other dropdowns (profile switcher / status picker).
 * Submenus drill in-place with a back header rather than flying out, so the
 * same layout works for touch.
 *
 * Dismissal: click/tap outside (pointerdown capture — this also guarantees only
 * one menu is open at a time, since opening another card's menu starts with a
 * pointerdown outside this one), Escape, any scroll outside the panel, viewport
 * resize, or a route change.
 */
export const TaskContextMenu = ({
    task,
    point,
    onClose,
    onStatusChange,
    onSelectEdit,
    editing,
    onStartTimer,
    onAddSubtask
}: TaskContextMenuProps) => {
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();

    // Archived-aware project options — same rules as the editor's ProjectField:
    // archived projects are hidden unless the task's CURRENT project is archived,
    // which stays visible so the task doesn't look unassigned.
    const projectsQuery = useProjects({ profileId: task.profile_id, includeArchived: true });
    const allProjects = projectsQuery.data?.projects ?? [];
    const projects = allProjects.filter((p) => !p.archived || p.id === task.project_id);
    const currentProject = allProjects.find((p) => p.id === task.project_id);

    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const priority = task.priority ?? 0;

    const [view, setView] = useState<MenuView>('root');
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<MenuPoint>(point);

    // Clamp to the viewport once the panel has a size; re-clamp when the view
    // changes since submenu heights differ.
    useLayoutEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const margin = 8;
        setPos({
            x: Math.max(margin, Math.min(point.x, window.innerWidth - rect.width - margin)),
            y: Math.max(margin, Math.min(point.y, window.innerHeight - rect.height - margin))
        });
    }, [point, view]);

    // Outside-dismissal listeners.
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) onClose();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const onScroll = (e: Event) => {
            // Ignore scrolls inside the panel itself (long project lists).
            if (panelRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    // Close on route change (e.g. something navigates while the menu is open).
    const location = useLocation();
    const openedAtPath = useRef(location.pathname);
    useEffect(() => {
        if (location.pathname !== openedAtPath.current) onClose();
    }, [location.pathname, onClose]);

    // Quiet partial PATCH via the shared mutation (it invalidates all the right
    // caches); errors toast like TaskEditor's save, successes stay silent.
    const patchTask = (data: TaskUpdate) => {
        updateTask.mutate(
            { taskId: task.id, data },
            { onError: () => toast.error('Failed to save changes. Please try again.') }
        );
        onClose();
    };

    const handleStatus = (s: TaskStatus) => {
        onStatusChange(s);
        onClose();
    };

    const openEditor = () => {
        // Open straight into the edit form (edit intent keeps it open even when
        // the pane already shows this task).
        onSelectEdit(true);
        onClose();
    };

    const handleStartTimer = () => {
        onClose();
        onStartTimer?.();
    };

    const handleAddSubtask = () => {
        // Prefer the inline quick-add popover; fall back to the editor.
        if (onAddSubtask) onAddSubtask();
        else onSelectEdit(true);
        onClose();
    };

    // Match TaskEditor's delete affordance: window.confirm, then the shared
    // delete mutation with its success/error toasts.
    const handleDelete = () => {
        onClose();
        if (deleteTask.isPending) return;
        if (!window.confirm('Delete this task? This cannot be undone.')) return;
        deleteTask.mutate(task.id, {
            onSuccess: () => toast.success('Task deleted'),
            onError: () => toast.error('Failed to delete task. Please try again.')
        });
    };

    const dueHint = task.due_date ? formatShortDate(parseLocalDate(task.due_date)) : 'None';
    const scheduledHint = task.scheduled_date
        ? formatShortDate(parseLocalDate(task.scheduled_date))
        : 'None';

    const panel = (
        <div
            ref={panelRef}
            role='menu'
            aria-label={`Task actions: ${task.title}`}
            className='fixed z-50 max-h-[70vh] w-56 overflow-y-auto rounded-button border p-1 shadow-popover outline-none'
            style={{
                left: pos.x,
                top: pos.y,
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--surface-card-border)'
            }}
            onContextMenu={(e) => {
                // Keep the browser menu off the panel, and stop the (React-tree)
                // bubble so the card doesn't reposition the menu.
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            {view === 'root' && (
                <>
                    <RootRow
                        label='Status'
                        hint={STATUS_META[status].label}
                        onClick={() => setView('status')}
                    />
                    <RootRow
                        label='Priority'
                        hint={PRIORITY_LEVELS[priority]?.label ?? 'None'}
                        onClick={() => setView('priority')}
                    />
                    <RootRow
                        label='Move to project'
                        hint={currentProject?.name ?? 'No project'}
                        onClick={() => setView('project')}
                    />
                    <RootRow label='Due' hint={dueHint} onClick={() => setView('due')} />
                    <RootRow
                        label='Scheduled'
                        hint={scheduledHint}
                        onClick={() => setView('scheduled')}
                    />

                    <Divider />

                    {onStartTimer && (
                        <button
                            type='button'
                            onClick={handleStartTimer}
                            className={`${itemClass} text-text-secondary`}
                        >
                            <Timer size={14} className='text-text-muted' />
                            Start timer
                        </button>
                    )}
                    {task.parent_id == null && (
                        <button
                            type='button'
                            onClick={handleAddSubtask}
                            className={`${itemClass} text-text-secondary`}
                        >
                            <ListPlus size={14} className='text-text-muted' />
                            Add subtask…
                        </button>
                    )}
                    <button
                        type='button'
                        onClick={openEditor}
                        className={`${itemClass} text-text-secondary`}
                    >
                        <Pencil size={14} className='text-text-muted' />
                        Edit…
                    </button>

                    <Divider />

                    <button
                        type='button'
                        onClick={handleDelete}
                        className={itemClass}
                        style={{ color: 'var(--color-danger)' }}
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                </>
            )}

            {view === 'status' && (
                <>
                    <SubHeader label='Status' onBack={() => setView('root')} />
                    <Divider />
                    {STATUS_ORDER.map((s) => {
                        const meta = STATUS_META[s];
                        const isCurrent = s === status;
                        return (
                            <button
                                key={s}
                                type='button'
                                onClick={() => handleStatus(s)}
                                className={itemClass}
                                style={isCurrent ? { backgroundColor: CURRENT_BG } : undefined}
                            >
                                <StatusGlyph status={s} size={16} color={meta.color} />
                                <span
                                    style={{
                                        color: isCurrent
                                            ? meta.color
                                            : 'var(--color-text-secondary)'
                                    }}
                                >
                                    {meta.label}
                                </span>
                                {isCurrent && (
                                    <Check
                                        size={14}
                                        className='ml-auto'
                                        style={{ color: meta.color }}
                                        strokeWidth={3}
                                    />
                                )}
                            </button>
                        );
                    })}
                </>
            )}

            {view === 'priority' && (
                <>
                    <SubHeader label='Priority' onBack={() => setView('root')} />
                    <Divider />
                    {PRIORITY_LEVELS.map((option) => {
                        const isCurrent = option.value === priority;
                        return (
                            <button
                                key={option.value}
                                type='button'
                                onClick={() => patchTask({ priority: option.value })}
                                className={itemClass}
                                style={isCurrent ? { backgroundColor: CURRENT_BG } : undefined}
                            >
                                <span
                                    className='inline-block h-2 w-2 shrink-0 rounded-full'
                                    style={{ backgroundColor: option.accent }}
                                />
                                <span
                                    style={{
                                        color: isCurrent
                                            ? option.accent
                                            : 'var(--color-text-secondary)'
                                    }}
                                >
                                    {option.label}
                                </span>
                                {isCurrent && (
                                    <Check
                                        size={14}
                                        className='ml-auto'
                                        style={{ color: option.accent }}
                                        strokeWidth={3}
                                    />
                                )}
                            </button>
                        );
                    })}
                </>
            )}

            {view === 'project' && (
                <>
                    <SubHeader label='Move to project' onBack={() => setView('root')} />
                    <Divider />
                    <button
                        type='button'
                        onClick={() => patchTask({ project_id: null })}
                        className={`${itemClass} text-text-secondary`}
                        style={
                            task.project_id == null ? { backgroundColor: CURRENT_BG } : undefined
                        }
                    >
                        <span className='inline-block h-2 w-2 shrink-0 rounded-full border border-text-faint' />
                        No project
                        {task.project_id == null && (
                            <Check size={14} className='ml-auto text-now-accent' strokeWidth={3} />
                        )}
                    </button>
                    {projects.map((project) => {
                        const isCurrent = project.id === task.project_id;
                        return (
                            <button
                                key={project.id}
                                type='button'
                                onClick={() => patchTask({ project_id: project.id })}
                                className={`${itemClass} text-text-secondary`}
                                style={isCurrent ? { backgroundColor: CURRENT_BG } : undefined}
                            >
                                <span
                                    className='inline-block h-2 w-2 shrink-0 rounded-full'
                                    style={{ backgroundColor: project.color }}
                                />
                                <span className='min-w-0 truncate'>
                                    {project.name}
                                    {project.archived ? ' (archived)' : ''}
                                </span>
                                {isCurrent && (
                                    <Check
                                        size={14}
                                        className='ml-auto shrink-0 text-now-accent'
                                        strokeWidth={3}
                                    />
                                )}
                            </button>
                        );
                    })}
                </>
            )}

            {view === 'due' && (
                <>
                    <SubHeader label='Due' onBack={() => setView('root')} />
                    <Divider />
                    {DATE_QUICK_SETS.map(({ label, offset }) => {
                        const date = quickDate(offset);
                        return (
                            <button
                                key={label}
                                type='button'
                                onClick={() => patchTask({ due_date: date })}
                                className={`${itemClass} text-text-secondary`}
                            >
                                {label}
                                <span className='ml-auto font-mono text-[10.5px] text-text-faint'>
                                    {formatShortDate(parseLocalDate(date))}
                                </span>
                            </button>
                        );
                    })}
                    <div className='px-2 py-1.5'>
                        <input
                            type='date'
                            defaultValue={task.due_date ?? ''}
                            onChange={(e) =>
                                e.target.value && patchTask({ due_date: e.target.value })
                            }
                            aria-label='Pick a due date'
                            className={dateInputClass}
                            style={dateInputStyle}
                        />
                    </div>
                    {task.due_date && (
                        <>
                            <Divider />
                            <button
                                type='button'
                                // Clearing drops the time too — a time without a
                                // date is meaningless (mirrors DateTimeField).
                                onClick={() => patchTask({ due_date: null, due_time: null })}
                                className={`${itemClass} text-text-muted`}
                            >
                                Clear due date
                            </button>
                        </>
                    )}
                </>
            )}

            {view === 'scheduled' && (
                <>
                    <SubHeader label='Scheduled' onBack={() => setView('root')} />
                    <Divider />
                    {DATE_QUICK_SETS.map(({ label, offset }) => {
                        const date = quickDate(offset);
                        return (
                            <button
                                key={label}
                                type='button'
                                // Scheduled date/time only stick on Scheduled tasks
                                // (the backend nulls them otherwise), so picking a
                                // date implies the status — mirrors TaskCaptureForm.
                                onClick={() =>
                                    patchTask({
                                        scheduled_date: date,
                                        status: TaskStatus.SCHEDULED
                                    })
                                }
                                className={`${itemClass} text-text-secondary`}
                            >
                                {label}
                                <span className='ml-auto font-mono text-[10.5px] text-text-faint'>
                                    {formatShortDate(parseLocalDate(date))}
                                </span>
                            </button>
                        );
                    })}
                    <div className='px-2 py-1.5'>
                        <input
                            type='date'
                            defaultValue={task.scheduled_date ?? ''}
                            onChange={(e) =>
                                e.target.value &&
                                patchTask({
                                    scheduled_date: e.target.value,
                                    status: TaskStatus.SCHEDULED
                                })
                            }
                            aria-label='Pick a scheduled date'
                            className={dateInputClass}
                            style={dateInputStyle}
                        />
                    </div>
                    {task.scheduled_date && (
                        <>
                            <Divider />
                            <button
                                type='button'
                                // Clears the date/time but leaves the status alone,
                                // matching the editor's DateTimeField clear.
                                onClick={() =>
                                    patchTask({ scheduled_date: null, scheduled_time: null })
                                }
                                className={`${itemClass} text-text-muted`}
                            >
                                Clear scheduled date
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );

    return createPortal(panel, document.body);
};
