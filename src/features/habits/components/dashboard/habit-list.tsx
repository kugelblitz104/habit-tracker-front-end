import type { HabitRead } from '@/api';
import { LoadingStatus } from '@/types/types';
import { useMemo } from 'react';
import { HabitListElement } from './habit-list-element';

export type HabitListProps = {
    habits: HabitRead[];
    loadingStatus: LoadingStatus;
    days?: number;
    onHabitDeleteClick: (habit: HabitRead) => void;
};

// TODO: context to hold number of days?

export const HabitList = ({
    habits,
    loadingStatus = LoadingStatus.PENDING,
    days = 0,
    onHabitDeleteClick
}: HabitListProps) => {
    // hooks - use useMemo to prevent hydration mismatch
    const today = useMemo(() => new Date(), []);
    const date_formatter = new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit'
    });

    // Render
    if (loadingStatus === LoadingStatus.PENDING) {
        return <div className='m-4'>Loading...</div>;
    }

    if (loadingStatus === LoadingStatus.ERROR) {
        return <div className='m-4'>Error loading habits</div>;
    }

    if (!habits || habits.length === 0) {
        return <div className='m-4'>No habits found.</div>;
    }

    return (
        <div className='overflow-x-auto mx-4'>
            <table className='min-w-full table-auto'>
                <thead>
                    <tr>
                        <th className='px-4 py-2 text-left'>Habit</th>
                        {Array.from({ length: days }, (_, i) => (
                            <th key={i} className='px-4 py-2 text-center'>
                                {date_formatter.format(
                                    new Date(
                                        today.getFullYear(),
                                        today.getMonth(),
                                        today.getDate() - i
                                    )
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {habits.map((habit) => (
                        <HabitListElement
                            key={habit.id}
                            habit={habit}
                            days={days}
                            onHabitDeleteClick={onHabitDeleteClick}
                        />
                    ))}
                </tbody>
            </table>
            {/* <SaveButton onClick={() => {
                // TODO: implement save functionality
                setIsLoading(true);
                setTimeout(() => {
                    setIsLoading(false);
                }, 5000);
            }} isLoading={isLoading} /> */}
        </div>
    );
};
