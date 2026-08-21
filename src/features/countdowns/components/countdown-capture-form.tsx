import { CaptureFormCard } from '@/components/ui/forms/capture-form-card';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useCreateCountdown } from '../api/create-countdowns';
import type { CountdownCaptureDraft } from './countdown-capture-bar';
import { CountdownFormFields, type CountdownFormValues } from './countdown-form-fields';

type CountdownCaptureFormProps = {
    profileId: number;
    initial: CountdownCaptureDraft;
    onClose: () => void;
};

/**
 * Expanded quick-add form for a countdown, seeded from the capture bar's
 * parsed draft. Owns the field values as local state; submitting always
 * creates (editing an existing countdown goes through CountdownForm).
 */
export const CountdownCaptureForm = ({
    profileId,
    initial,
    onClose
}: CountdownCaptureFormProps) => {
    const create = useCreateCountdown();
    const [values, setValues] = useState<CountdownFormValues>({
        title: initial.title,
        date: initial.targetDate ?? '',
        time: '',
        taskId: null,
        categoryId: initial.categoryId,
        repeat: 'none',
        showOccurrence: false
    });
    const patch = (next: Partial<CountdownFormValues>) => setValues((v) => ({ ...v, ...next }));

    const canSubmit = values.title.trim().length > 0 && !!values.date && !create.isPending;

    const submit = () => {
        if (!canSubmit) return;
        create.mutate(
            {
                profile_id: profileId,
                title: values.title.trim(),
                target_date: values.date,
                target_time: values.time || null,
                task_id: values.taskId,
                category_id: values.categoryId,
                repeat: values.repeat,
                show_occurrence: values.showOccurrence
            },
            {
                onSuccess: () => {
                    toast.success('Countdown created');
                    onClose();
                },
                onError: () => toast.error('Failed to add countdown. Please try again.')
            }
        );
    };

    return (
        <CaptureFormCard
            onCancel={onClose}
            onSubmit={submit}
            canSubmit={canSubmit}
            isPending={create.isPending}
            submitLabel='Add countdown'
            pendingLabel='Adding…'
        >
            <CountdownFormFields
                profileId={profileId}
                values={values}
                onChange={patch}
                disabled={create.isPending}
                fieldId='countdown-task-new'
                initialCreatingGroupName={initial.createGroupName}
                onTitleEnter={submit}
            />
        </CaptureFormCard>
    );
};
