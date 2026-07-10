import type { HabitCreate, HabitRead } from '@/api';
import { ColorPicker } from '@/components/ui/forms/color-picker';
import { FrequencyPicker } from '@/components/ui/forms/frequency-picker';
import { LabeledSwitch } from '@/components/ui/forms/labeled-switch';
import { TextField } from '@/components/ui/forms/text-field';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { getFrequencyString } from '@/lib/date-utils';
import {
    sanitizeFormData,
    sanitizeMultilineText,
    sanitizeText,
    validationPatterns
} from '@/lib/input-sanitization';
import { useRecentColors } from '@/lib/use-recent-colors';
import type { Frequency } from '@/types/types';
import { Button, CloseButton, Field, Fieldset, Label, Textarea } from '@headlessui/react';
import { Controller, FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type AddHabitModalProps = {
    isOpen: boolean;
    onClose: () => void;
    handleAddHabit: (habit: HabitCreate) => void;
    habit?: HabitRead;
};

interface IAddModalFormInput {
    name: string;
    question: string;
    color: string;
    frequency: Frequency;
    reminder: boolean;
    notes: string;
}

export const AddHabitModal = ({
    isOpen = false,
    onClose,
    handleAddHabit,
    habit
}: AddHabitModalProps) => {
    const { addRecentColor } = useRecentColors();
    const methods = useForm<IAddModalFormInput>({
        values: habit
            ? {
                  name: habit.name,
                  question: habit.question,
                  color: habit.color,
                  frequency: {
                      name: getFrequencyString(habit.frequency, habit.range),
                      frequency: habit.frequency,
                      range: habit.range
                  },
                  reminder: habit.reminder ?? true,
                  notes: habit.notes ?? ''
              }
            : undefined
    });
    const errors = methods.formState.errors;
    const onSubmit: SubmitHandler<IAddModalFormInput> = (data) => {
        // Sanitize form inputs
        const sanitizedData = sanitizeFormData(data, {
            name: sanitizeText,
            question: sanitizeText,
            notes: sanitizeMultilineText
        });

        if (!habit || data.color.toLowerCase() !== habit.color.toLowerCase())
            addRecentColor(data.color);

        handleAddHabit({
            ...sanitizedData,
            range: sanitizedData.frequency.range,
            frequency: sanitizedData.frequency.frequency
        });
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={() => {
                methods.reset();
                onClose();
            }}
            title={habit ? 'Edit Habit' : 'Add a new Habit'}
        >
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <Fieldset className='space-y-1'>
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
                        <Controller
                            name='color'
                            control={methods.control}
                            defaultValue='#aabbcc'
                            render={({ field }) => (
                                <ColorPicker color={field.value} onColorChange={field.onChange} />
                            )}
                        />
                        <Controller
                            name='frequency'
                            control={methods.control}
                            defaultValue={{
                                name: 'daily',
                                frequency: 1,
                                range: 1
                            }}
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
                            defaultValue={true}
                            render={({ field }) => (
                                <LabeledSwitch
                                    label='Reminder'
                                    checked={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        <Field className='mb-2'>
                            <Label className='mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint'>
                                Notes
                            </Label>
                            <Textarea
                                {...methods.register('notes', validationPatterns.notes)}
                                className='block w-full resize-none rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 focus-visible:ring-now-accent'
                                style={{
                                    backgroundColor: 'var(--surface-input-bg)',
                                    borderColor: methods.formState.errors.notes
                                        ? 'var(--color-danger)'
                                        : 'var(--surface-input-border)'
                                }}
                                wrap='soft'
                            />
                            {methods.formState.errors.notes && (
                                <span className='mt-1 block font-mono text-[11px] text-danger'>
                                    {methods.formState.errors.notes.message as string}
                                </span>
                            )}
                        </Field>
                    </Fieldset>
                    <div className='mt-4 flex justify-end gap-2'>
                        <CloseButton className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary'>
                            Close
                        </CloseButton>
                        <Button
                            type='submit'
                            className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-90'
                            style={{
                                background: 'var(--button-primary-gradient)',
                                color: 'var(--button-primary-text)'
                            }}
                        >
                            Submit
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </BaseModal>
    );
};
