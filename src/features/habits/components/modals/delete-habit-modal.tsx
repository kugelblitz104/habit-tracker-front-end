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
        <BaseModal isOpen={isOpen} onClose={onClose} title='Delete habit'>
            <div
                className='rounded-row border px-3 py-2.5'
                style={{
                    backgroundColor: 'var(--surface-input-bg)',
                    borderColor: 'var(--surface-input-border)'
                }}
            >
                <Label mainText={habit.name} textColor={habit.color} />
            </div>
            <div className='space-y-3 font-mono text-[12px] leading-relaxed text-text-muted'>
                <p>
                    This action is{' '}
                    <strong className='font-semibold text-danger'>irreversible</strong>. All habit
                    data including tracking history will be permanently deleted.
                </p>
                <p>
                    If you simply want to stop tracking this habit, consider{' '}
                    <strong className='font-semibold text-text-secondary'>archiving</strong> it
                    instead. This will preserve your habit data for future reference, while
                    removing it from your active habits list.
                </p>
            </div>
            <div className='flex justify-end gap-2'>
                <CloseButton className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-text-secondary'>
                    Cancel
                </CloseButton>
                <Button
                    type='submit'
                    className='rounded-button px-3.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-90'
                    style={{
                        backgroundColor: 'var(--color-danger-solid)',
                        color: 'var(--button-primary-text)'
                    }}
                    onClick={() => onSubmit(habit)}
                >
                    Delete habit
                </Button>
            </div>
        </BaseModal>
    );
};
