import { ColorPicker } from '@/components/ui/forms/color-picker';
import { formLabelClass } from '@/components/ui/forms/form-field-styles';
import { FrequencyPicker } from '@/components/ui/forms/frequency-picker';
import { LabeledSwitch } from '@/components/ui/forms/labeled-switch';
import { TextField } from '@/components/ui/forms/text-field';
import { validationPatterns } from '@/lib/input-sanitization';
import type { Frequency } from '@/types/types';
import { Field, Fieldset, Label, Textarea } from '@headlessui/react';
import { Controller, useFormContext } from 'react-hook-form';

export type HabitFormValues = {
    name: string;
    question: string;
    color: string;
    frequency: Frequency;
    category: string;
    reminder: boolean;
    notes: string;
};

/**
 * Map a habit's (frequency, range) to the FrequencyPicker's PRESET name key
 * ('daily' | 'weekly' | 'monthly' | 'custom'). This must be a preset key, not a
 * human display string, so the picker highlights the right radio and only shows
 * the "N times every M days" row for 'custom'.
 */
export const frequencyPresetName = (frequency: number, range: number): string => {
    if (frequency === range) return 'daily';
    if (frequency === 1 && range === 7) return 'weekly';
    if (frequency === 1 && range === 30) return 'monthly';
    return 'custom';
};

type HabitFormFieldsProps = {
    /** Plain Enter (no shift) in the name field submits, for the quick-add form. */
    onNameEnter?: () => void;
    /** Autofocus the name field, for the quick-add form only. */
    autoFocusName?: boolean;
};

/**
 * The habit field block: name, question, category, colour, frequency, reminder,
 * notes. Rendered by both the inline editor and the quick-add expanded form, so
 * the two stay identical. Must sit inside a `FormProvider<HabitFormValues>`.
 */
export const HabitFormFields = ({ onNameEnter, autoFocusName = false }: HabitFormFieldsProps) => {
    const { control, formState, register } = useFormContext<HabitFormValues>();
    const errors = formState.errors;
    return (
        <Fieldset>
            <TextField
                isRequired
                label='Habit name'
                name='name'
                placeholder='What will you do?'
                isValid={!errors.name}
                validation={validationPatterns.habitName}
                autoFocus={autoFocusName}
                onKeyDown={
                    onNameEnter
                        ? (e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  onNameEnter();
                              }
                          }
                        : undefined
                }
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
                control={control}
                render={({ field }) => (
                    <ColorPicker mode='full' color={field.value} onColorChange={field.onChange} />
                )}
            />
            <Controller
                name='frequency'
                control={control}
                render={({ field }) => (
                    <FrequencyPicker selected={field.value} onSelectedChange={field.onChange} />
                )}
            />
            <Controller
                name='reminder'
                control={control}
                render={({ field }) => (
                    <LabeledSwitch
                        label='Reminder'
                        checked={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <Field className='mb-3'>
                <Label className={formLabelClass}>Notes</Label>
                <Textarea
                    {...register('notes', validationPatterns.notes)}
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
    );
};
