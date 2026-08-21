import type { HabitCreate } from '@/api';
import { CaptureFormCard } from '@/components/ui/forms/capture-form-card';
import { sanitizeFormData, sanitizeMultilineText, sanitizeText } from '@/lib/input-sanitization';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useCreateHabit } from '../api/create-habits';
import { HabitFormFields, type HabitFormValues } from './details/habit-form-fields';

type HabitCaptureFormProps = {
    profileId: number;
    /** Name carried over from the capture bar. */
    initialName: string;
    onClose: () => void;
};

/**
 * Expanded quick-add form for a habit, opened by Shift+Enter or the + button in
 * the capture bar. Sits inline where the bar was and renders the same fields as
 * `HabitEditor`. The bar's own Enter path still creates a daily habit from a
 * name alone; this is the path that sets the rest at creation time.
 */
export const HabitCaptureForm = ({ profileId, initialName, onClose }: HabitCaptureFormProps) => {
    const createHabit = useCreateHabit();
    const methods = useForm<HabitFormValues>({
        defaultValues: {
            name: initialName,
            question: '',
            // Matches the capture bar's own quick-create defaults.
            color: '#7fa8c9',
            frequency: { name: 'daily', frequency: 1, range: 1 },
            category: '',
            reminder: true,
            notes: ''
        }
    });

    const name = methods.watch('name');
    const canSubmit = name.trim().length > 0 && !createHabit.isPending;

    const onValid: SubmitHandler<HabitFormValues> = (data) => {
        const clean = sanitizeFormData(data, {
            name: sanitizeText,
            question: sanitizeText,
            category: sanitizeText,
            notes: sanitizeMultilineText
        });

        const payload: HabitCreate = {
            profile_id: profileId,
            name: clean.name,
            question: clean.question,
            color: clean.color,
            frequency: clean.frequency.frequency,
            range: clean.frequency.range,
            reminder: clean.reminder,
            notes: clean.notes,
            category: clean.category ? clean.category : null
        };

        createHabit.mutate(payload, {
            onSuccess: () => {
                toast.success('Habit created');
                onClose();
            },
            // Keep the form open with the drafted fields intact on failure.
            onError: () => toast.error('Failed to add habit. Please try again.')
        });
    };

    const submit = () => void methods.handleSubmit(onValid)();

    return (
        <FormProvider {...methods}>
            <CaptureFormCard
                onCancel={onClose}
                onSubmit={submit}
                canSubmit={canSubmit}
                isPending={createHabit.isPending}
                submitLabel='Add habit'
                pendingLabel='Adding…'
            >
                <HabitFormFields onNameEnter={submit} autoFocusName />
            </CaptureFormCard>
        </FormProvider>
    );
};
