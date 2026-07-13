import { BaseModal } from '@/components/ui/modals/base-modal';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { TimeEntryKind } from '@/types/types';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useCreateTimeEntry } from '../api/create-time-entries';
import { fromLocalInput } from './editable-time-log';
import { LabelInput } from './label-input';
import { ProjectSelect } from './project-select';
import { TaskSelect } from './task-select';

type ManualEntryFormProps = {
    isOpen: boolean;
    onClose: () => void;
    profileId: number | null | undefined;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** datetime-local value for "now + offsetMinutes" (local wall time). */
const nowLocalInput = (offsetMinutes = 0): string => {
    const d = new Date(Date.now() + offsetMinutes * 60_000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
};

const fieldLabelClass =
    'mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-text-faint';
const inputClass =
    'w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent';
const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark'
};

/**
 * "Add entry" modal for logging an already-completed time entry with an
 * explicit start and end (as opposed to TimerPanel's live start/stop flow).
 * Reuses TaskSelect/ProjectSelect the same way TimerPanel does — the target
 * is optional (leave the select on its placeholder for an untethered entry)
 * — and the same datetime-local <-> ISO conversion EntryEditor uses for its
 * start/end fields, so the round-trip stays consistent across the log.
 */
export const ManualEntryForm = ({ isOpen, onClose, profileId }: ManualEntryFormProps) => {
    const createTimeEntry = useCreateTimeEntry();

    const [targetType, setTargetType] = useState<'task' | 'project'>('task');
    const [taskId, setTaskId] = useState<number | null>(null);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [label, setLabel] = useState('');
    const [start, setStart] = useState(() => nowLocalInput(-30));
    const [end, setEnd] = useState(() => nowLocalInput(0));

    const reset = () => {
        setTargetType('task');
        setTaskId(null);
        setProjectId(null);
        setLabel('');
        setStart(nowLocalInput(-30));
        setEnd(nowLocalInput(0));
    };

    const handleClose = () => {
        if (createTimeEntry.isPending) return;
        reset();
        onClose();
    };

    const startIso = fromLocalInput(start);
    const endIso = fromLocalInput(end);
    const rangeInvalid =
        !!startIso && !!endIso && new Date(endIso).getTime() < new Date(startIso).getTime();
    const canSubmit = !!profileId && !!startIso && !!endIso && !rangeInvalid;

    const handleSubmit = () => {
        if (!canSubmit || !profileId || !startIso || !endIso || createTimeEntry.isPending) return;
        createTimeEntry.mutate(
            {
                profile_id: profileId,
                kind: TimeEntryKind.STOPWATCH,
                label: label.trim() || null,
                task_id: targetType === 'task' ? taskId : null,
                project_id: targetType === 'project' ? projectId : null,
                started_at: startIso,
                ended_at: endIso
            },
            {
                onSuccess: () => {
                    toast.success('Entry added');
                    reset();
                    onClose();
                },
                onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add entry'))
            }
        );
    };

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose} title='Add time entry' panelClassName='max-w-sm'>
            <div className='flex flex-col gap-3'>
                <div>
                    <span className={fieldLabelClass}>Attach to</span>
                    <div
                        className='inline-flex items-center gap-1 rounded-chip border p-0.5'
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
                                    className='rounded-chip px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors'
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

                {targetType === 'task' ? (
                    <TaskSelect
                        profileId={profileId}
                        value={taskId}
                        onChange={setTaskId}
                        disabled={createTimeEntry.isPending}
                        id='manual-entry-task'
                    />
                ) : (
                    <ProjectSelect
                        profileId={profileId}
                        value={projectId}
                        onChange={setProjectId}
                        disabled={createTimeEntry.isPending}
                        id='manual-entry-project'
                    />
                )}

                <LabelInput
                    profileId={profileId}
                    value={label}
                    onChange={setLabel}
                    disabled={createTimeEntry.isPending}
                    placeholder='Label (optional)'
                />

                <div className='flex gap-2'>
                    <label className='min-w-0 flex-1'>
                        <span className={fieldLabelClass}>Start</span>
                        <input
                            type='datetime-local'
                            required
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                            disabled={createTimeEntry.isPending}
                            aria-label='Start time'
                            className={`${inputClass} disabled:opacity-60`}
                            style={inputStyle}
                        />
                    </label>
                    <label className='min-w-0 flex-1'>
                        <span className={fieldLabelClass}>End</span>
                        <input
                            type='datetime-local'
                            required
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            disabled={createTimeEntry.isPending}
                            aria-label='End time'
                            className={`${inputClass} disabled:opacity-60`}
                            style={inputStyle}
                        />
                    </label>
                </div>

                {rangeInvalid && (
                    <p className='font-mono text-[11px] text-danger'>End must be on or after start.</p>
                )}

                <div className='flex justify-end gap-2 pt-1'>
                    <button
                        type='button'
                        onClick={handleClose}
                        disabled={createTimeEntry.isPending}
                        className='inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 font-mono text-[11.5px] text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50'
                    >
                        Cancel
                    </button>
                    <button
                        type='button'
                        onClick={handleSubmit}
                        disabled={!canSubmit || createTimeEntry.isPending}
                        className='inline-flex items-center gap-1.5 rounded-button px-3.5 py-1.5 font-display text-[12.5px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                        style={{
                            background: 'var(--button-primary-gradient)',
                            color: 'var(--button-primary-text)'
                        }}
                    >
                        Add entry
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
