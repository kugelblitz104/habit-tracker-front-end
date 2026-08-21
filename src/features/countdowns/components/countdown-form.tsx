import type { CountdownRead } from '@/api';
import { Button } from '@/components/ui/buttons/button';
import { useUpdateCountdown } from '@/features/countdowns/api/update-countdowns';
import {
    CountdownFormFields,
    type CountdownFormValues
} from '@/features/countdowns/components/countdown-form-fields';
import type { CountdownRepeat } from '@/features/countdowns/utils/countdown';
import { useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Edit form for an existing countdown. Creation goes through
 * CountdownCaptureBar/CountdownCaptureForm instead.
 */
export const CountdownForm = ({
    profileId,
    initial,
    onDone,
    onCancel
}: {
    profileId: number;
    initial: CountdownRead;
    onDone: () => void;
    onCancel?: () => void;
}) => {
    const update = useUpdateCountdown();
    const [values, setValues] = useState<CountdownFormValues>({
        title: initial.title,
        date: initial.target_date,
        time: (initial.target_time ?? '').slice(0, 5),
        taskId: initial.task_id ?? null,
        categoryId: initial.category_id ?? null,
        repeat: (initial.repeat as CountdownRepeat) ?? 'none',
        showOccurrence: initial.show_occurrence ?? false
    });
    const patchValues = (patch: Partial<CountdownFormValues>) =>
        setValues((v) => ({ ...v, ...patch }));

    const isPending = update.isPending;
    const canSave = values.title.trim().length > 0 && !!values.date && !isPending;

    const submit = () => {
        if (!canSave) return;
        const data = {
            profile_id: profileId,
            title: values.title.trim(),
            target_date: values.date,
            target_time: values.time || null,
            task_id: values.taskId,
            category_id: values.categoryId,
            repeat: values.repeat,
            show_occurrence: values.showOccurrence
        };
        update.mutate(
            { countdownId: initial.id, data },
            {
                onSuccess: () => {
                    toast.success('Countdown updated');
                    onDone();
                },
                onError: () => toast.error('Failed to update countdown.')
            }
        );
    };

    return (
        <div className='flex flex-col gap-3.5'>
            <CountdownFormFields
                profileId={profileId}
                values={values}
                onChange={patchValues}
                disabled={isPending}
                fieldId={`countdown-task-${initial.id}`}
            />

            <div className='flex items-center justify-end gap-2 pt-1'>
                {onCancel && (
                    <Button
                        size='sm'
                        variant='subtle'
                        onClick={onCancel}
                        className='font-mono uppercase tracking-[0.08em] text-text-muted'
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    size='sm'
                    variant='primary'
                    onClick={submit}
                    disabled={!canSave}
                    className='font-mono uppercase tracking-[0.08em]'
                >
                    Save
                </Button>
            </div>
        </div>
    );
};
