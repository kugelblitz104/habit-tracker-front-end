import { TaskStatus } from '@/types/types';
import type { TaskCreate } from '@/api';
import { Plus } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useProjects } from '@/features/projects/api/get-projects';
import { useCreateTask } from '../api/create-tasks';
import { parseTaskInput } from '../utils/parse-task-input';
import { HighlightedTaskInput } from './highlighted-task-input';

/**
 * Everything the expanded capture form needs to pre-fill its fields from a
 * one-line quick-add draft. `projectId` is a matched project; `createProjectName`
 * is set instead when an `@name` token matched nothing, so the form can offer an
 * inline "create it" confirmation.
 */
export type TaskCaptureDraft = {
    title: string;
    priority?: number;
    scheduledDate?: string;
    dueDate?: string;
    estimatedMinutes?: number;
    notes?: string;
    projectId: number | null;
    createProjectName?: string;
};

type TaskCaptureBarProps = {
    profileId: number | null | undefined;
    /** Project surfaces pre-attach new tasks here (an `@token` still overrides). */
    defaultProjectId?: number | null;
    /** Open the detailed form carrying the parsed draft (Shift+Enter or the + button). */
    onExpand: (draft: TaskCaptureDraft) => void;
    disabled?: boolean;
    placeholder?: string;
};

/**
 * Task quick-capture bar with inline token support (see parse-task-input). The
 * typed tokens are highlighted live; Enter creates the task with everything
 * parsed, and Shift+Enter (or the leading + button — the mobile path, since
 * there's no Shift+Enter on a touch keyboard) expands into the full form with
 * the fields pre-filled. An `@name` that matches no project routes through the
 * expanded form so the user can confirm creating it.
 */
export const TaskCaptureBar = ({
    profileId,
    defaultProjectId = null,
    onExpand,
    disabled = false,
    placeholder = 'Add a task…  (!high  *8-16  >8-19  @project  @"two words"  ~30  -notes)'
}: TaskCaptureBarProps) => {
    const [value, setValue] = useState('');
    const createTask = useCreateTask();
    const projectsQuery = useProjects({ profileId, includeArchived: false });

    const parsed = useMemo(() => parseTaskInput(value, new Date().getFullYear()), [value]);

    const matchProject = (name: string): number | null => {
        const lower = name.toLowerCase();
        const projects = projectsQuery.data?.projects ?? [];
        const exact = projects.find((p) => p.name.toLowerCase() === lower);
        if (exact) return exact.id;
        // Fall back to a unique prefix match so "@mark" finds "Marketing".
        const prefix = projects.filter((p) => p.name.toLowerCase().startsWith(lower));
        return prefix.length === 1 ? prefix[0]!.id : null;
    };

    const buildDraft = (): TaskCaptureDraft => {
        const draft: TaskCaptureDraft = {
            title: parsed.cleanTitle,
            priority: parsed.priority,
            scheduledDate: parsed.scheduledDate,
            dueDate: parsed.dueDate,
            estimatedMinutes: parsed.estimatedMinutes,
            notes: parsed.notes,
            projectId: defaultProjectId
        };
        if (parsed.projectName) {
            const matched = matchProject(parsed.projectName);
            if (matched != null) draft.projectId = matched;
            else draft.createProjectName = parsed.projectName;
        }
        return draft;
    };

    const isPending = createTask.isPending;
    const canAct = !!profileId && !disabled && !isPending;

    const expand = () => {
        if (!canAct) return;
        onExpand(buildDraft());
        setValue('');
    };

    const create = () => {
        if (!canAct || !profileId) return;
        const title = parsed.cleanTitle;
        if (!title) return;

        // An unmatched @project can't be created silently — hand off to the
        // expanded form's inline "create project?" confirmation instead.
        if (parsed.projectName && matchProject(parsed.projectName) == null) {
            expand();
            return;
        }

        const data: TaskCreate = { profile_id: profileId, title };
        if (parsed.priority != null) data.priority = parsed.priority;
        if (parsed.notes) data.notes = parsed.notes;
        if (parsed.estimatedMinutes != null) data.estimated_effort = parsed.estimatedMinutes;
        if (parsed.dueDate) data.due_date = parsed.dueDate;
        if (parsed.scheduledDate) {
            data.scheduled_date = parsed.scheduledDate;
            // Scheduled data only sticks on Scheduled tasks (see the editor).
            data.status = TaskStatus.SCHEDULED;
        }
        const projectId = parsed.projectName ? matchProject(parsed.projectName) : defaultProjectId;
        if (projectId != null) data.project_id = projectId;

        createTask.mutate(data, {
            onSuccess: () => {
                toast.success('Task created');
                setValue('');
            },
            onError: () => toast.error('Failed to add task. Please try again.')
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (e.shiftKey) expand();
        else create();
    };

    return (
        <div
            className='mb-[30px] flex items-center gap-2 rounded-button border px-3 py-2.5'
            style={{
                backgroundColor: 'var(--surface-input-bg)',
                borderColor: 'var(--surface-input-border)',
                opacity: disabled ? 0.5 : 1
            }}
        >
            <button
                type='button'
                onClick={expand}
                disabled={!canAct}
                aria-label='Add details'
                title='Add details'
                className='shrink-0 rounded-full p-0.5 text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed'
            >
                <Plus size={18} />
            </button>
            <HighlightedTaskInput
                value={value}
                segments={parsed.segments}
                onChange={setValue}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isPending}
                ariaLabel='Add a task'
            />
            <span className='hidden shrink-0 items-center gap-2 font-mono text-[10px] text-text-faint sm:flex'>
                <span>↵ add</span>
                <span>⇧↵ details</span>
            </span>
        </div>
    );
};
