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
import type { Frequency } from '@/types/types';
import {
    Button,
    CloseButton,
    Field,
    Fieldset,
    Label,
    Textarea
} from '@headlessui/react';
import {
    Controller,
    FormProvider,
    useForm,
    type SubmitHandler
} from 'react-hook-form';

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
            onClose={onClose}
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
                                <ColorPicker
                                    color={field.value}
                                    onColorChange={field.onChange}
                                />
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
                            <Label className='block'>Notes</Label>
                            <Textarea
                                {...methods.register(
                                    'notes',
                                    validationPatterns.notes
                                )}
                                className={`block bg-black border-slate rounded-md py-1 px-2 w-full
                                ${
                                    methods.formState.errors.notes &&
                                    'border-red-500'
                                }`}
                            />
                            {methods.formState.errors.notes && (
                                <span className='text-red-400 text-sm mt-1 block'>
                                    {
                                        methods.formState.errors.notes
                                            .message as string
                                    }
                                </span>
                            )}
                        </Field>
                    </Fieldset>
                    <div className='flex space-x-2'>
                        <Button
                            type='submit'
                            className='flex-auto bg-sky-500 rounded-md px-2 py-1'
                        >
                            Submit
                        </Button>
                        <CloseButton className='flex-auto bg-red-500 rounded-md px-2 py-1'>
                            Close
                        </CloseButton>
                    </div>
                </form>
            </FormProvider>
        </BaseModal>
    );
};
