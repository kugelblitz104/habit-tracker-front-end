import type { HabitRead, HabitUpdate } from '@/api';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { sanitizeFormData, sanitizeMultilineText, sanitizeText } from '@/lib/input-sanitization';
import { useRecentColors } from '@/lib/use-recent-colors';
import { Trash2, X } from 'lucide-react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { HabitFormFields, frequencyPresetName, type HabitFormValues } from './habit-form-fields';

type HabitEditorProps = {
    habit: HabitRead;
    /** Persist the merged habit update (wired to the existing updateHabit mutation). */
    onSave: (payload: HabitUpdate) => void | Promise<unknown>;
    /** Leave edit mode without saving. */
    onCancel: () => void;
    /** Open the delete confirmation (mirrors the task editor's in-form Delete). */
    onDelete?: () => void;
    /** Reflects the parent mutation's pending state. */
    isSaving?: boolean;
};

/**
 * Inline habit editor rendered in place of the detail read-view (mirroring the
 * task editor's inline pattern) rather than in a modal. It uses the shared field
 * components (TextField/ColorPicker/FrequencyPicker…) + react-hook-form,
 * sanitizes on submit, and hands a merged HabitUpdate payload up to `onSave`.
 */
export const HabitEditor = ({
    habit,
    onSave,
    onCancel,
    onDelete,
    isSaving = false
}: HabitEditorProps) => {
    const { addRecentColor } = useRecentColors();
    const methods = useForm<HabitFormValues>({
        values: {
            name: habit.name,
            question: habit.question,
            color: habit.color,
            frequency: {
                name: frequencyPresetName(habit.frequency, habit.range),
                frequency: habit.frequency,
                range: habit.range
            },
            category: habit.category ?? '',
            reminder: habit.reminder ?? true,
            notes: habit.notes ?? ''
        }
    });
    const onSubmit: SubmitHandler<HabitFormValues> = (data) => {
        const sanitized = sanitizeFormData(data, {
            name: sanitizeText,
            question: sanitizeText,
            category: sanitizeText,
            notes: sanitizeMultilineText
        });

        if (data.color.toLowerCase() !== habit.color.toLowerCase()) addRecentColor(data.color);

        onSave({
            name: sanitized.name,
            question: sanitized.question,
            color: sanitized.color,
            frequency: sanitized.frequency.frequency,
            range: sanitized.frequency.range,
            category: sanitized.category ? sanitized.category : null,
            reminder: sanitized.reminder,
            notes: sanitized.notes
        });
    };

    return (
        <div className='flex flex-col'>
            {/* Header row OUTSIDE the card, mirroring the task pane's PaneHeader:
                mono uppercase micro-label + an X that bails out without saving. */}
            <div className='mb-1 flex items-center justify-between'>
                <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                    Edit habit
                </h2>
                <button
                    type='button'
                    onClick={onCancel}
                    aria-label='Close editor'
                    className='rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary'
                >
                    <X size={16} />
                </button>
            </div>
            <div className='flex flex-col gap-3 rounded-card border p-5' style={CARD_SURFACE_STYLE}>
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)}>
                        <HabitFormFields />
                        {/* Footer: destructive Delete on the left (mirrors the task
                            editor), Cancel / Save on the right. */}
                        <div className='mt-3 flex items-center justify-between gap-2'>
                            {onDelete ? (
                                <button
                                    type='button'
                                    onClick={onDelete}
                                    className='inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors hover:brightness-125'
                                    style={{
                                        borderColor: 'var(--danger-border)',
                                        color: 'var(--color-danger)'
                                    }}
                                >
                                    <Trash2 size={13} />
                                    Delete habit
                                </button>
                            ) : (
                                <span />
                            )}
                            <div className='flex items-center gap-2'>
                                <button
                                    type='button'
                                    onClick={onCancel}
                                    className='rounded-button px-3 py-1.5 font-display text-[12px] text-text-muted transition-colors hover:text-text-secondary'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='submit'
                                    disabled={isSaving}
                                    className='rounded-button px-3 py-1.5 font-display text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                                    style={{
                                        background: 'var(--button-primary-gradient)',
                                        color: 'var(--button-primary-text)'
                                    }}
                                >
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    );
};
