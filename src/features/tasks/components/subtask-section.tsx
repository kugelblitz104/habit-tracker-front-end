import type { TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import {
    closestCenter,
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpFromLine, GripVertical, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useCreateTask } from '../api/create-tasks';
import { useDeleteTask } from '../api/delete-tasks';
import { useTasks } from '../api/get-tasks';
import { useSortTasks } from '../api/sort-tasks';
import { useUpdateTask } from '../api/update-tasks';
import { sortSubtasks } from '../utils/subtasks';
import { SubtaskRow } from './subtask-row';
import { formFieldClass, formFieldStyle, formLabelClass } from './task-form-fields';

type SubtaskSectionProps = {
    /** The task being edited — must be a top-level task (subtasks are one level deep). */
    parent: TaskRead;
};

type SortableSubtaskRowProps = {
    subtask: TaskRead;
    disabled: boolean;
    onStatusChange: (status: TaskStatus) => void;
    actions: React.ReactNode;
};

/** One draggable subtask row — owns its dnd-kit sortable wiring and renders the
 *  shared SubtaskRow with a grip handle (only the grip starts a drag, so the
 *  status glyph and promote/delete buttons stay independently clickable). */
const SortableSubtaskRow = ({
    subtask,
    disabled,
    onStatusChange,
    actions
}: SortableSubtaskRowProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: subtask.id
    });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const handle = (
        <button
            type='button'
            aria-label={`Drag to reorder "${subtask.title}"`}
            className='shrink-0 cursor-grab touch-none text-text-faint transition-colors hover:text-text-secondary'
            {...listeners}
        >
            <GripVertical size={13} />
        </button>
    );

    return (
        <SubtaskRow
            subtask={subtask}
            variant='checklist'
            onStatusChange={onStatusChange}
            disabled={disabled}
            actions={actions}
            handle={handle}
            setNodeRef={setNodeRef}
            style={style}
            attributes={attributes}
            isDragging={isDragging}
        />
    );
};

/**
 * "Subtasks" section of the task editor: a drag-to-reorder checklist of the
 * parent's subtasks plus an inline add input. Subtasks arrive in the profile's
 * tasks-list response with `parent_id` set (fetched with `includeClosed` so
 * completed ones stay visible). Completed subtasks sink to the bottom; within
 * each group the manual `sort_order` drives the order. Each row surfaces the
 * full 8-status picker (via the round glyph), a promote-to-task action and a
 * ghost delete (no confirm — subtasks are lightweight); a subtask's other
 * fields (priority, notes, …) stay hidden until it's promoted.
 */
export const SubtaskSection = ({ parent }: SubtaskSectionProps) => {
    const queryClient = useQueryClient();
    const tasksQuery = useTasks({ profileId: parent.profile_id, includeClosed: true });
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();
    const sortTasks = useSortTasks();

    const [newTitle, setNewTitle] = useState('');
    const [hideDone, setHideDone] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const allSubtasks = useMemo(
        () => (tasksQuery.data?.tasks ?? []).filter((task) => task.parent_id === parent.id),
        [tasksQuery.data, parent.id]
    );
    const doneCount = allSubtasks.filter((task) => task.status === TaskStatus.DONE).length;

    // Canonical display order (done at the bottom, then sort_order). The "Hide
    // done" toggle drops completed rows entirely.
    const visible = useMemo(
        () => sortSubtasks(allSubtasks.filter((t) => !hideDone || t.status !== TaskStatus.DONE)),
        [allSubtasks, hideDone]
    );

    // Local order for optimistic drag feedback; resynced whenever the canonical
    // list changes (add/delete/status flip/server reorder).
    const [ordered, setOrdered] = useState<TaskRead[]>(visible);
    useEffect(() => setOrdered(visible), [visible]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = ordered.findIndex((t) => t.id === active.id);
        const newIndex = ordered.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const next = [...ordered];
        const [moved] = next.splice(oldIndex, 1);
        if (!moved) return;
        next.splice(newIndex, 0, moved);
        setOrdered(next); // optimistic; the invalidation below reconciles
        sortTasks.mutate(
            next.map((t) => t.id),
            { onError: () => toast.error('Failed to reorder subtasks. Please try again.') }
        );
    };

    const handleStatusChange = (subtask: TaskRead, status: TaskStatus) => {
        if (status === subtask.status) return;
        updateTask.mutate(
            { taskId: subtask.id, data: { status } },
            { onError: () => toast.error('Failed to update subtask. Please try again.') }
        );
    };

    // No confirm: subtasks are lightweight (the shared delete mutation has no
    // built-in confirm either). The parent's detail query is refreshed here so
    // its subtask counts stay current — delete responses carry no parent_id.
    const handleDelete = (subtaskId: number) => {
        deleteTask.mutate(subtaskId, {
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['task', { taskId: parent.id }] }),
            onError: () => toast.error('Failed to delete subtask. Please try again.')
        });
    };

    // Promote a subtask to a full top-level task (parent_id → null). The update
    // hook refreshes the list + the subtask itself; the old parent's single-task
    // query is refreshed here so its subtask count updates.
    const handlePromote = (subtaskId: number) => {
        updateTask.mutate(
            { taskId: subtaskId, data: { parent_id: null } },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: ['task', { taskId: parent.id }]
                    });
                    toast.success('Promoted to a task');
                },
                onError: () => toast.error('Failed to promote subtask. Please try again.')
            }
        );
    };

    // Enter creates and clears immediately, keeping focus for rapid entry; the
    // typed title is restored on failure (only if nothing new was typed since).
    // New subtasks land at the bottom of the open group (sort_order past the max).
    const handleCreate = () => {
        const title = newTitle.trim();
        if (!title) return;
        setNewTitle('');
        const nextOrder = allSubtasks.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0) + 1;
        createTask.mutate(
            { profile_id: parent.profile_id, parent_id: parent.id, title, sort_order: nextOrder },
            {
                onError: () => {
                    toast.error('Failed to add subtask. Please try again.');
                    setNewTitle((current) => current || title);
                }
            }
        );
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Swallow Enter so the host pane/editor doesn't save or close.
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleCreate();
        }
    };

    return (
        <div>
            <div className='mb-1 flex items-center justify-between gap-2'>
                <span className={`${formLabelClass} mb-0`}>
                    Subtasks
                    {allSubtasks.length > 0 && (
                        <span className='ml-1.5 font-normal normal-case tracking-normal'>
                            {doneCount}/{allSubtasks.length}
                        </span>
                    )}
                </span>
                {doneCount > 0 && (
                    <button
                        type='button'
                        onClick={() => setHideDone((v) => !v)}
                        className='font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint transition-colors hover:text-text-secondary'
                    >
                        {hideDone ? 'Show done' : 'Hide done'}
                    </button>
                )}
            </div>

            {tasksQuery.isLoading && (
                <p className='font-mono text-[11px] text-text-faint'>Loading subtasks…</p>
            )}
            {tasksQuery.isError && (
                <p className='font-mono text-[11px] text-danger'>Failed to load subtasks.</p>
            )}

            {ordered.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={ordered.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <ul className='mb-1.5 flex flex-col'>
                            {ordered.map((subtask) => (
                                <SortableSubtaskRow
                                    key={subtask.id}
                                    subtask={subtask}
                                    disabled={updateTask.isPending}
                                    onStatusChange={(status) => handleStatusChange(subtask, status)}
                                    actions={
                                        <>
                                            <button
                                                type='button'
                                                onClick={() => handlePromote(subtask.id)}
                                                disabled={updateTask.isPending}
                                                aria-label={`Promote subtask "${subtask.title}" to a task`}
                                                title='Promote to a task'
                                                className='shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50'
                                            >
                                                <ArrowUpFromLine size={12} />
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => handleDelete(subtask.id)}
                                                disabled={deleteTask.isPending}
                                                aria-label={`Delete subtask "${subtask.title}"`}
                                                title='Delete subtask'
                                                className='shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50'
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </>
                                    }
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}

            <input
                ref={inputRef}
                type='text'
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Add a subtask… (Enter)'
                aria-label='New subtask title'
                className={`${formFieldClass} placeholder:text-text-faint`}
                style={formFieldStyle}
            />
        </div>
    );
};
