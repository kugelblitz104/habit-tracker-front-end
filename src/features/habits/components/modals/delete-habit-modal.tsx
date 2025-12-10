import type { HabitRead } from '@/api';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { Label } from '@/components/ui/label';
import { Button, CloseButton } from '@headlessui/react';

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
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title='Are you sure that you want to delete this habit?'
        >
            <div className='p2'>
                <Label mainText={habit.name} textColor={habit.color} />
            </div>
            <div>
                <p>
                    This action is <strong>irreversible</strong>. All habit data
                    including tracking history will be permanently deleted.
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
        </BaseModal>
    );
};
