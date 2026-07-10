import type { TaskCreate } from '@/api';
import { sanitizeMultilineText } from '@/lib/input-sanitization';
import { TaskStatus } from '@/types/types';
import { useId, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useCreateTask } from '../api/create-tasks';
import {
    DateTimeField,
    formFieldClass,
    formFieldStyle,
    formLabelClass,
    NotesField,
    PriorityField,
    ProjectField
} from './task-form-fields';

type TaskCaptureFormProps = {
    profileId: number;
    /** Title typed into the capture bar before it expanded (may be empty). */
    initialTitle: string;
    /** Collapse back to the capture bar (Cancel, Escape, or after a create). */
    onClose: () => void;
};

/**
 * Expanded quick-capture form, opened by Shift+Enter in the capture bar. Sits
 * inline where the bar was and lets details (notes, priority, due, scheduled,
 * project) be set at creation time. Built from the same field primitives as
 * `TaskEditor` so the two forms stay visually identical. Enter in the title
 * field submits the whole form; Escape anywhere cancels.
 */
export const TaskCaptureForm = ({ profileId, initialTitle, onClose }: TaskCaptureFormProps) => {
    const formId = useId();
    const createTask = useCreateTask();

    const [title, setTitle] = useState(initialTitle);
    const [notes, setNotes] = useState('');
    const [priority, setPriority] = useState(0);
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [projectId, setProjectId] = useState<number | null>(null);

    const canSubmit = title.trim().length > 0 && !createTask.isPending;

    const handleSubmit = () => {
        if (!canSubmit) return;

        const data: TaskCreate = { profile_id: profileId, title: title.trim() };

        const cleanNotes = sanitizeMultilineText(notes);
        if (cleanNotes.length > 0) data.notes = cleanNotes;
        if (priority !== 0) data.priority = priority;
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
            {/* Title */}
            <div>
                <label className={formLabelClass} htmlFor={`capture-title-${formId}`}>
                    Title
                </label>
                <input
                    id={`capture-title-${formId}`}
                    type='text'
                    value={title}
                    autoFocus
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder='What needs doing?'
                    className={`${formFieldClass} font-display text-[13px] text-text-primary placeholder:text-text-faint`}
                    style={formFieldStyle}
                />
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
                    <ProjectField
                        id={`capture-project-${formId}`}
                        profileId={profileId}
                        value={projectId}
                        onChange={setProjectId}
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
