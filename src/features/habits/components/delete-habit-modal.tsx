import { Label } from '@/components/ui/label';
import type { Frequency } from '@/types/types';
import type { HabitRead } from '@/api';
import {
    CloseButton,
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
    Button
} from '@headlessui/react';
import { FormProvider, type SubmitHandler } from 'react-hook-form';

type DeleteHabitModalProps = {
    isOpen: boolean;
    habit: HabitRead;
    onClose: () => void;
    handleDeleteHabit: (habit: HabitRead) => void;
};

export const DeleteHabitModal = ({
    isOpen = false,
    habit,
    onClose,
    handleDeleteHabit
}: DeleteHabitModalProps) => {
    const onSubmit = (data: HabitRead) => {
        handleDeleteHabit(data);
        onClose();
    };

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
                        Are you sure that you want to delete this habit?
                    </DialogTitle>
                    <div className='p2'>
                        <Label mainText={habit.name} textColor={habit.color} />
                    </div>
                    <div>
                        <p>
                            This action is <strong>irreversible</strong>. All
                            habit data including tracking history will be
                            permanently deleted.
                        </p>
                    </div>
                    <div className='flex space-x-2'>
                        <Button
                            type='submit'
                            className='flex-auto bg-red-500 rounded-md px-2 py-1'
                            onClick={() => onSubmit(habit)}
                        >
                            Delete
                        </Button>
                        <CloseButton className='flex-auto bg-sky-500 rounded-md px-2 py-1'>
                            Cancel
                        </CloseButton>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
};
