import type { HabitRead } from '@/api';
import { ConfirmModal } from '@/components/ui/modals/confirm-modal';
import { Label } from '@/components/ui/label';

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
    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={() => handleDeleteHabit(habit)}
            title='Delete habit'
            confirmLabel='Delete habit'
            danger
            bodyClassName='space-y-3'
            preface={
                <div
                    className='rounded-row border px-3 py-2.5'
                    style={{
                        backgroundColor: 'var(--surface-input-bg)',
                        borderColor: 'var(--surface-input-border)'
                    }}
                >
                    <Label mainText={habit.name} textColor={habit.color} />
                </div>
            }
        >
            <p>
                This action is <strong className='font-semibold text-danger'>irreversible</strong>.
                All habit data including tracking history will be permanently deleted.
            </p>
            <p>
                If you simply want to stop tracking this habit, consider{' '}
                <strong className='font-semibold text-text-secondary'>archiving</strong> it instead.
                This will preserve your habit data for future reference, while removing it from your
                active habits list.
            </p>
        </ConfirmModal>
    );
};
