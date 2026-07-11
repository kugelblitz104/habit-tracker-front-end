import type { TaskCreate } from '@/api';
import { useAuth } from '@/lib/auth-context';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useCreateTask } from '../api/create-tasks';
import { parseTaskInput } from '../utils/parse-task-input';
import type { TaskCaptureDraft } from './task-capture-bar';
import { HighlightedTaskInput } from './highlighted-task-input';
import {
    DateTimeField,
    EstimatedEffortField,
    formLabelClass,
    NotesField,
    PriorityField,
    ProjectField
} from './task-form-fields';

type TaskCaptureFormProps = {
    profileId: number;
    /** Parsed one-line draft carried over from the capture bar. */
    initial: TaskCaptureDraft;
    /** Collapse back to the capture bar (Cancel, Escape, or after a create). */
    onClose: () => void;
};

/**
 * Expanded quick-capture form, opened by Shift+Enter / the + button in the
 * capture bar. Sits inline where the bar was and lets details (notes, priority,
 * due, scheduled, project, estimate) be set at creation time. Fields arrive
 * pre-filled from the capture bar's parsed tokens; the title also keeps parsing
 * tokens live, so typing e.g. `!high` here still lights up the Priority field.
 * Built from the same field primitives as `TaskEditor` so the two forms stay
 * visually identical. Enter in the title submits; Escape anywhere cancels.
 */
export const TaskCaptureForm = ({ profileId, initial, onClose }: TaskCaptureFormProps) => {
    const formId = useId();
    const createTask = useCreateTask();
    const { activeProfile } = useAuth();
    const showEstimatedEffort = activeProfile?.show_estimated_effort ?? false;

    const [title, setTitle] = useState(initial.title);
    const [notes, setNotes] = useState(initial.notes ?? '');
    const [priority, setPriority] = useState(initial.priority ?? 0);
    const [dueDate, setDueDate] = useState(initial.dueDate ?? '');
    const [dueTime, setDueTime] = useState('');
    const [scheduledDate, setScheduledDate] = useState(initial.scheduledDate ?? '');
    const [scheduledTime, setScheduledTime] = useState('');
    const [projectId, setProjectId] = useState<number | null>(initial.projectId);
    const [estimatedEffort, setEstimatedEffort] = useState<number | null>(
        initial.estimatedMinutes ?? null
    );

    // Track the token values already applied so live re-parsing only pushes a
    // field when its token actually changes — manual edits to a field then stick.
    const applied = useRef({
        priority: initial.priority,
        scheduledDate: initial.scheduledDate,
        dueDate: initial.dueDate,
        estimatedMinutes: initial.estimatedMinutes
    });

    const parsed = useMemo(() => parseTaskInput(title, new Date().getFullYear()), [title]);

    // Live token → field population as the title is edited (priority/dates/est).
    // Notes and project stay in their own fields to avoid double-editing surfaces.
    const handleTitleChange = (next: string) => {
        setTitle(next);
        const p = parseTaskInput(next, new Date().getFullYear());
        if (p.priority !== applied.current.priority) {
            setPriority(p.priority ?? 0);
            applied.current.priority = p.priority;
        }
        if (p.scheduledDate !== applied.current.scheduledDate) {
            setScheduledDate(p.scheduledDate ?? '');
            applied.current.scheduledDate = p.scheduledDate;
        }
        if (p.dueDate !== applied.current.dueDate) {
            setDueDate(p.dueDate ?? '');
            applied.current.dueDate = p.dueDate;
        }
        if (p.estimatedMinutes !== applied.current.estimatedMinutes) {
            setEstimatedEffort(p.estimatedMinutes ?? null);
            applied.current.estimatedMinutes = p.estimatedMinutes;
        }
    };

    const canSubmit = parsed.cleanTitle.length > 0 && !createTask.isPending;

    const handleSubmit = () => {
        if (!canSubmit) return;

        const data: TaskCreate = { profile_id: profileId, title: parsed.cleanTitle };

        const cleanNotes = sanitizeMultilineText(notes);
        if (cleanNotes.length > 0) data.notes = cleanNotes;
        if (priority !== 0) data.priority = priority;
        if (estimatedEffort != null) data.estimated_effort = estimatedEffort;
        if (dueDate) {
            data.due_date = dueDate;
            if (dueTime) data.due_time = dueTime;
        }
        if (scheduledDate) {
            data.scheduled_date = scheduledDate;
            if (scheduledTime) data.scheduled_time = scheduledTime;
            // Scheduled date/time only stick on Scheduled tasks (the backend
            // nulls them otherwise), so picking a date implies the status.
            data.status = TaskStatus.SCHEDULED;
        }
        if (projectId !== null) data.project_id = projectId;

        createTask.mutate(data, {
            onSuccess: () => {
                toast.success('Task created');
                onClose();
            },
            // Keep the form open with the drafted fields intact on failure.
            onError: () => toast.error('Failed to add task. Please try again.')
        });
    };

    // Escape anywhere inside the form collapses it, discarding the draft.
    const handleFormKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && !createTask.isPending) {
            e.preventDefault();
            onClose();
        }
    };

    // Enter in the title submits the FULL form — never a title-only create.
    const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div
            className='mb-[30px] flex flex-col gap-3 rounded-button border p-4'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
            onKeyDown={handleFormKeyDown}
        >
            {/* Title (keeps highlighting/parsing tokens live) */}
            <div>
                <label className={formLabelClass} htmlFor={`capture-title-${formId}`}>
                    Title
                </label>
                <div
                    className='w-full rounded-button border px-2.5 py-1.5'
                    style={{
                        backgroundColor: 'var(--surface-input-bg)',
                        borderColor: 'var(--surface-input-border)'
                    }}
                >
                    <HighlightedTaskInput
                        value={title}
                        segments={parsed.segments}
                        onChange={handleTitleChange}
                        onKeyDown={handleTitleKeyDown}
                        placeholder='What needs doing?'
                        autoFocus
                        ariaLabel='Task title'
                        inputRef={undefined}
                    />
                </div>
            </div>

            {/* Notes / description */}
            <NotesField id={`capture-notes-${formId}`} value={notes} onChange={setNotes} />

            {/* Priority on the left; dates + project stacked on the right. */}
            <div className='grid gap-3 md:grid-cols-2'>
                <PriorityField value={priority} onChange={setPriority} />
                <div className='flex flex-col gap-3'>
                    <DateTimeField
                        label='Due'
                        date={dueDate}
                        time={dueTime}
                        onDateChange={setDueDate}
                        onTimeChange={setDueTime}
                        dateAriaLabel='Due date'
                        timeAriaLabel='Due time'
                    />
                    <DateTimeField
                        label='Scheduled for'
                        date={scheduledDate}
                        time={scheduledTime}
                        onDateChange={setScheduledDate}
                        onTimeChange={setScheduledTime}
                        dateAriaLabel='Scheduled date'
                        timeAriaLabel='Scheduled time'
                    />
                    {showEstimatedEffort && (
                        <EstimatedEffortField
                            id={`capture-estimate-${formId}`}
                            value={estimatedEffort}
                            onChange={setEstimatedEffort}
                        />
                    )}
                    <ProjectField
                        id={`capture-project-${formId}`}
                        profileId={profileId}
                        value={projectId}
                        onChange={setProjectId}
                        initialCreatingName={initial.createProjectName}
                    />
                </div>
            </div>

            {/* Footer: ghost Cancel, primary Add task (mirrors TaskEditor's footer). */}
            <div className='mt-1 flex items-center justify-end gap-2'>
                <button
                    type='button'
                    onClick={onClose}
                    className='rounded-button px-3 py-1.5 font-display text-[12px] text-text-muted transition-colors hover:text-text-secondary'
                >
                    Cancel
                </button>
                <button
                    type='button'
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className='rounded-button px-3 py-1.5 font-display text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                    style={{
                        background: 'var(--button-primary-gradient)',
                        color: 'var(--button-primary-text)'
                    }}
                >
                    {createTask.isPending ? 'Adding…' : 'Add task'}
                </button>
            </div>
        </div>
    );
};
