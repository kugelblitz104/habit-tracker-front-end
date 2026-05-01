import type { HabitUpdate } from '@/api';
import { CalendarBoard } from '@/features/habits/components/details/calendar-board';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { StreakChart } from '@/features/habits/components/details/streak-chart';
import { AddHabitModal } from '@/features/habits/components/modals/add-habit-modal';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { useHabitDetail } from '@/features/habits/hooks/use-habit-detail';
import { getFrequencyString, toLocalDateString } from '@/lib/date-utils';
import { Archive, ArchiveRestore, Bell, Calendar, CalendarPlus, Pencil, Trash } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ButtonVariant } from '../ui/buttons/action-button';
import { PageShell } from '../ui/page-shell';
import { SubtitleBar } from '../ui/subtitle-bar';
import { type ActionConfig } from '../ui/title-bar';
import { ErrorPage } from './error-page';
import { LoadingPage } from './loading-page';

type HabitDetailViewProps = {
    habitId: number;
};

export const HabitDetailView = ({ habitId }: HabitDetailViewProps) => {
    // hooks
    const {
        weeks,
        days,
        habit,
        trackers,
        habitKPIs,
        habitStreaks,
        handleTrackerCreate,
        handleTrackerUpdate,
        handleHabitUpdate,
        handleHabitDelete,
        habitLoading,
        trackersLoading,
        habitError
    } = useHabitDetail(habitId);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const navigate = useNavigate();

    // Pagination state - endDate defaults to today
    const [endDate, setEndDate] = useState<string>(() => toLocalDateString(new Date()));

    // Handler for page changes from CalendarBoard
    const handlePageChange = useCallback((newEndDate: string) => {
        setEndDate(newEndDate);
    }, []);

    // Derive the calendar window by filtering the full history to [endDate - days, endDate]
    const windowTrackers = useMemo(() => {
        if (!trackers.length) return [];
        const windowEnd = endDate;
        const windowStartDate = new Date(endDate + 'T00:00:00');
        windowStartDate.setDate(windowStartDate.getDate() - days + 1);
        const windowStart = toLocalDateString(windowStartDate);
        return trackers.filter((t) => t.dated >= windowStart && t.dated <= windowEnd);
    }, [trackers, endDate, days]);

    // The calendar can page back as long as the habit existed before the current window
    const hasPrevious = useMemo(() => {
        if (!habit?.created_date) return false;
        const windowStart = new Date(endDate + 'T00:00:00');
        windowStart.setDate(windowStart.getDate() - days + 1);
        return new Date(habit.created_date) < windowStart;
    }, [habit?.created_date, endDate, days]);

    if (habitLoading || trackersLoading) {
        return <LoadingPage />;
    }

    if (habitError) {
        return <ErrorPage message='Error Loading habit query data' />;
    }

    const freqStr = habit ? getFrequencyString(habit.frequency, habit.range) : '';
    const reminderStatus = habit ? (habit.reminder ? 'on' : 'off') : '';

    const titleBarActions = [
        {
            label: 'Edit',
            onClick: () => setIsEditModalOpen(true),
            icon: <Pencil size={20} />,
            variant: ButtonVariant.Secondary
        },
        habit && {
            label: habit.archived ? 'Unarchive' : 'Archive',
            onClick: () => handleHabitUpdate(habit.id, { archived: !habit.archived }),
            icon: habit.archived ? <ArchiveRestore size={20} /> : <Archive size={20} />,
            variant: ButtonVariant.Secondary
        },
        {
            label: 'Delete',
            onClick: () => setIsDeleteModalOpen(true),
            icon: <Trash size={20} />,
            variant: ButtonVariant.Danger
        }
    ].filter(Boolean) as ActionConfig[];

    return (
        <PageShell title={`${habit?.name}`} actions={titleBarActions}>
            <SubtitleBar
                subtitles={[
                    {
                        text: habit?.question || '',
                        color: habit?.color,
                        bold: true
                    },
                    {
                        text: freqStr,
                        icon: <Calendar size={16} className='inline-flex mr-1' />
                    },
                    {
                        text: `Created: ${habit ? habit.created_date.split('T')[0] : ''}`,
                        icon: <CalendarPlus size={16} className='inline-flex mr-1' />
                    },
                    {
                        text: reminderStatus,
                        icon: <Bell size={16} className='inline-flex mr-1' />
                    }
                ]}
            />
            <KpiBoard habitKPIS={habitKPIs} />
            <CalendarBoard
                habit={habit}
                trackers={windowTrackers}
                weeks={weeks}
                endDate={endDate}
                hasPrevious={hasPrevious}
                isLoading={trackersLoading}
                onPageChange={handlePageChange}
                onTrackerCreate={handleTrackerCreate}
                onTrackerUpdate={handleTrackerUpdate}
            />
            <StreakChart streaks={habitStreaks || []} color={habit?.color} />
            {habit && (
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onHabitDelete={() => {
                        handleHabitDelete(habit.id);
                        setIsDeleteModalOpen(false);
                        navigate('/', { replace: true });
                    }}
                />
            )}
            {habit && (
                <AddHabitModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    habit={habit}
                    onAddHabit={(updatedHabit: HabitUpdate) => {
                        if (habit?.id) {
                            handleHabitUpdate(habit.id, updatedHabit);
                        }
                    }}
                />
            )}
        </PageShell>
    );
};
