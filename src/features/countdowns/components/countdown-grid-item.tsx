import type { CountdownRead } from '@/api';
import { Button } from '@/components/ui/buttons/button';
import { useDeleteCountdown } from '@/features/countdowns/api/delete-countdowns';
import { useUpdateCountdown } from '@/features/countdowns/api/update-countdowns';
import { CountdownCard } from '@/features/countdowns/components/countdown-card';
import type { Countdown } from '@/features/countdowns/utils/countdown';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

/** A read-only countdown card in the grid, with edit/archive/delete controls. */
export const CountdownGridItem = ({
    countdown,
    calc,
    now,
    onEdit,
    categoryColor,
    categoryName
}: {
    countdown: CountdownRead;
    calc: Countdown;
    now: Date;
    onEdit: () => void;
    categoryColor?: string;
    categoryName?: string;
}) => {
    const del = useDeleteCountdown();
    const update = useUpdateCountdown();
    const isArchived = countdown.archived_date != null;

    const handleDelete = () => {
        if (del.isPending) return;
        if (!window.confirm(`Delete countdown "${countdown.title}"?`)) return;
        del.mutate(countdown.id, {
            onSuccess: () => toast.success('Countdown deleted'),
            onError: () => toast.error('Failed to delete countdown.')
        });
    };

    const handleArchive = () => {
        if (update.isPending) return;
        update.mutate(
            { countdownId: countdown.id, data: { archived: !isArchived } },
            {
                onSuccess: () =>
                    toast.success(isArchived ? 'Countdown restored' : 'Countdown archived'),
                onError: () =>
                    toast.error(
                        isArchived ? 'Failed to restore countdown.' : 'Failed to archive countdown.'
                    )
            }
        );
    };

    return (
        <CountdownCard
            countdown={countdown}
            calc={calc}
            now={now}
            categoryColor={categoryColor}
            categoryName={categoryName}
            actions={
                // gap-2, not gap-1: each control is now a 44px touch target on a
                // coarse pointer, and the old 8px gap would overlap them.
                <div className='absolute right-2 top-2 flex items-center gap-2'>
                    <Button size='sm' variant='icon' onClick={onEdit} aria-label='Edit countdown'>
                        <Pencil size={14} />
                    </Button>
                    <Button
                        size='sm'
                        variant='icon'
                        onClick={handleArchive}
                        disabled={update.isPending}
                        aria-label={isArchived ? 'Restore countdown' : 'Archive countdown'}
                    >
                        {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    </Button>
                    <Button
                        size='sm'
                        variant='icon'
                        onClick={handleDelete}
                        disabled={del.isPending}
                        aria-label='Delete countdown'
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            }
        />
    );
};
