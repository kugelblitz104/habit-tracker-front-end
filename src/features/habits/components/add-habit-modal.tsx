import { ColorPicker } from '@/components/ui/forms/color-picker';
import { FrequencyPicker } from '@/components/ui/forms/frequency-picker';
import { LabeledSwitch } from '@/components/ui/forms/labeled-switch';
import { TextField } from '@/components/ui/forms/text-field';
import type { Frequency } from '@/types/types';
import type { HabitCreate } from '@/api';
import {
    CloseButton,
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
    Field,
    Fieldset,
    Input,
    Label,
    Radio,
    RadioGroup,
    Switch,
    Textarea,
    Button
} from '@headlessui/react';
import { useEffect, useState } from 'react';
import {
    Controller,
    FormProvider,
    useForm,
    type SubmitHandler
} from 'react-hook-form';

type AddHabitModalProps = {
    isOpen: boolean;
    userId: number;
    onClose: () => void;
    handleAddHabit: (habit: HabitCreate) => void; //should return a habit?
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
    userId,
    onClose,
    handleAddHabit
}: AddHabitModalProps) => {
    const methods = useForm<IAddModalFormInput>();
    const errors = methods.formState.errors;
    const onSubmit: SubmitHandler<IAddModalFormInput> = (data) => {
        handleAddHabit({
            ...data,
            range: data.frequency.range,
            frequency: data.frequency.frequency,
            user_id: userId
        });
        onClose();
    };

    // prefill data
    // useEffect(()=> {
    //     methods.reset({
    //         name: 'data'
    //     })
    // }, [methods.reset]);

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            transition
            className='
            relative z-50
            transition-opacity
            duration-500
            ease-out
            data-closed:opacity-0
        '
        >
            <DialogBackdrop className='fixed inset-0 bg-black/50' />
            <div className='fixed inset-0 flex items-center justify-center p-4'>
                <DialogPanel className='max-w-lg space-y-4 rounded-md bg-slate-800 p-8'>
                    <DialogTitle as='h2' className='text-2xl font-bold'>
                        Add a new Habit
                    </DialogTitle>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <Fieldset className='space-y-1'>
                                <TextField
                                    isRequired
                                    label='Habit name'
                                    name='name'
                                    placeholder='What will you do?'
                                    isValid={!errors.name}
                                />
                                <TextField
                                    label='Question'
                                    name='question'
                                    placeholder='What signifies completion?'
                                    isValid={!errors.question}
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
                                        {...methods.register('notes')}
                                        className={`block bg-black border-slate rounded-md py-1 px-2 w-full
                                        ${
                                            methods.formState.errors.notes &&
                                            'border-red-500'
                                        }`}
                                    />
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
                </DialogPanel>
            </div>
        </Dialog>
    );
};

// user_id: number;
// name: string;
// question: string;
// color: string;
// frequency: string;
// reminder: boolean;
// notes: string;
