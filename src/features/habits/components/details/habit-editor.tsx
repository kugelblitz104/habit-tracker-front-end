import type { HabitRead, HabitUpdate } from '@/api';
import { ColorPicker } from '@/components/ui/forms/color-picker';
import { FrequencyPicker } from '@/components/ui/forms/frequency-picker';
import { LabeledSwitch } from '@/components/ui/forms/labeled-switch';
import { TextField } from '@/components/ui/forms/text-field';
import {
    sanitizeFormData,
    sanitizeMultilineText,
    sanitizeText,
    validationPatterns
} from '@/lib/input-sanitization';
import { useRecentColors } from '@/lib/use-recent-colors';
import type { Frequency } from '@/types/types';
import { Field, Fieldset, Label, Textarea } from '@headlessui/react';
import { Trash2, X } from 'lucide-react';
import { Controller, FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

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

interface IHabitEditorFormInput {
    name: string;
    question: string;
    color: string;
    frequency: Frequency;
    category: string;
    reminder: boolean;
    notes: string;
}

/**
 * Map a habit's (frequency, range) to the FrequencyPicker's PRESET name key
 * ('daily' | 'weekly' | 'monthly' | 'custom'). This must be a preset key — not a
 * human display string — so the picker highlights the right radio and only shows
 * the "N times every M days" row for 'custom'.
 */
const frequencyPresetName = (frequency: number, range: number): string => {
    if (frequency === range) return 'daily';
    if (frequency === 1 && range === 7) return 'weekly';
    if (frequency === 1 && range === 30) return 'monthly';
    return 'custom';
};

/**
 * Inline habit editor rendered in place of the detail read-view (mirroring the
 * task editor's inline pattern) rather than in a modal. It reuses the same field
 * components + react-hook-form setup the AddHabitModal uses, sanitizes on submit,
 * and hands a merged HabitUpdate payload up to `onSave`.
 */
export const HabitEditor = ({
    habit,
    onSave,
    onCancel,
    onDelete,
    isSaving = false
}: HabitEditorProps) => {
    const { addRecentColor } = useRecentColors();
    const methods = useForm<IHabitEditorFormInput>({
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
    const errors = methods.formState.errors;

    const onSubmit: SubmitHandler<IHabitEditorFormInput> = (data) => {
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
            <div
                className='flex flex-col gap-3 rounded-card border p-5'
                style={{
                    backgroundColor: 'var(--surface-card-bg)',
                    borderColor: 'var(--surface-card-border)'
                }}
            >
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)}>
                        <Fieldset>
                            <TextField
                                isRequired
                                label='Habit name'
                                name='name'
                                placeholder='What will you do?'
                                isValid={!errors.name}
                                validation={validationPatterns.habitName}
                            />
                            <TextField
                                label='Question'
                                name='question'
                                placeholder='What signifies completion?'
                                isValid={!errors.question}
                                validation={validationPatterns.question}
                            />
                            <TextField
                                label='Category'
                                name='category'
                                placeholder='Optional grouping'
                                isValid={!errors.category}
                            />
                            <Controller
                                name='color'
                                control={methods.control}
                                render={({ field }) => (
                                    <ColorPicker
                                        color={field.value}
                                        onColorChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                name='frequency'
                                control={methods.control}
                                render={({ field }) => (
                                    <FrequencyPicker
                                        selected={field.value}
                                        onSelectedChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                name='reminder'
                                control={methods.control}
                                render={({ field }) => (
                                    <LabeledSwitch
                                        label='Reminder'
                                        checked={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <Field className='mb-3'>
                                <Label className='mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint'>
                                    Notes
                                </Label>
                                <Textarea
                                    {...methods.register('notes', validationPatterns.notes)}
                                    rows={4}
                                    className='block w-full resize-y rounded-button border px-2.5 py-1.5 font-mono text-[12px] leading-relaxed text-text-secondary outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 focus-visible:ring-now-accent'
                                    style={{
                                        backgroundColor: 'var(--surface-input-bg)',
                                        borderColor: errors.notes
                                            ? 'var(--color-danger)'
                                            : 'var(--surface-input-border)'
                                    }}
                                    wrap='soft'
                                />
                                {errors.notes && (
                                    <span className='mt-1 block text-[11px] text-red-400'>
                                        {errors.notes.message as string}
                                    </span>
                                )}
                            </Field>
                        </Fieldset>
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
