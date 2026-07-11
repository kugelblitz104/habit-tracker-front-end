import { CalendarBoard } from '@/features/habits/components/details/calendar-board';
import { HabitEditor } from '@/features/habits/components/details/habit-editor';
import { KpiBoard } from '@/features/habits/components/details/kpi-board';
import { StreakChart } from '@/features/habits/components/details/streak-chart';
import { WeekdayChart } from '@/features/habits/components/details/weekday-chart';
import { DeleteHabitModal } from '@/features/habits/components/modals/delete-habit-modal';
import { useHabitDetailData } from '@/features/habits/hooks/use-habit-detail-data';
import { useAuth } from '@/lib/auth-context';
import { parseLocalDate } from '@/lib/date-utils';
import { Archive, ArchiveRestore, Pencil, Trash } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

type HabitDetailBodyProps = {
    habitId: number;
    /** Called after a successful delete so the host can close the pane / navigate away. */
    onDeleted?: () => void;
    /**
     * Narrow-width host (the ~480px master-detail pane). Stacks the calendar and
     * analytics into a single column instead of the 2-col page layout.
     */
    compact?: boolean;
    /** Notifies the host (pane) when the inline edit surface opens/closes so it
     *  can drop its card chrome while editing. */
    onEditingChange?: (editing: boolean) => void;
};

/** "4× / week" style frequency label for the meta row. */
const frequencyMeta = (frequency: number, range: number): string => {
    if (frequency === range) return 'daily';
    const unit =
        range === 7 ? 'week' : range === 30 ? 'month' : range === 365 ? 'year' : `${range}d`;
    return `${frequency}× / ${unit}`;
};

/**
 * Shell-agnostic habit detail. Renders its own header row (name + meta +
 * Edit/Archive/Delete actions) and the read/edit views; all data fetching,
 * tracker/KPI/streak optimism, and edit/delete mutations live in
 * `useHabitDetailData`. It never renders any page chrome so it can be dropped
 * into either the master-detail pane (wide) or the full-page cool shell
 * (narrow / deep-link).
 */
export const HabitDetailBody = ({
    habitId,
    onDeleted,
    compact = false,
    onEditingChange
}: HabitDetailBodyProps) => {
    // hooks
    const [isEditing, setIsEditing] = useState(false);

    // Per-profile display preferences (both default to the server defaults when
    // the profile record predates the flags).
    const { activeProfile } = useAuth();
    const weekStartMonday = activeProfile?.week_start_monday ?? true;
    const useHabitColorAccent = activeProfile?.use_habit_color_accent ?? false;

    // Let the host react to edit-mode (e.g. the pane drops its card chrome).
    useEffect(() => {
        onEditingChange?.(isEditing);
    }, [isEditing, onEditingChange]);

    const {
        habit,
        trackers,
        habitQuery,
        kpisQuery,
        streaksQuery,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        habitsEdit,
        habitsDelete,
        handleTrackerCreate,
        handleTrackerUpdate
    } = useHabitDetailData(habitId);

    if (habitQuery.isLoading) {
        return (
            <div className='flex items-center justify-center py-16 font-mono text-[12px] text-text-muted'>
                Loading habit…
            </div>
        );
    }

    if (habitQuery.isError) {
        return (
            <div className='flex items-center justify-center py-16 font-mono text-[12px] text-[var(--color-danger)]'>
                Couldn’t load this habit.
            </div>
        );
    }

    const sinceLabel = habit
        ? parseLocalDate(habit.created_date.split('T')[0] ?? habit.created_date).toLocaleDateString(
              'en-US',
              {
                  month: 'short',
                  year: 'numeric'
              }
          )
        : '';

    const ghostButton =
        'inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors';

    // The detail view's accent, threaded to every child (KPI rings, streak bars,
    // weekday-chart fills, month-grid completed chips, note pips) as CSS custom
    // properties on the root element. With use_habit_color_accent ON the habit's
    // own color drives all of them (shades derived via color-mix); OFF keeps the
    // theme's fixed cool-blue values, matching the pre-flag rendering exactly.
    const habitAccent = useHabitColorAccent && habit?.color ? habit.color : null;
    const accentVars = {
        '--habit-detail-accent': habitAccent ?? '#6f9dc0',
        '--habit-detail-accent-bright': habitAccent
            ? `color-mix(in srgb, ${habitAccent} 70%, white)`
            : '#8fc0e0',
        '--habit-detail-accent-soft': habitAccent
            ? `color-mix(in srgb, ${habitAccent} 48%, #191d22)`
            : '#3f5a6b',
        '--habit-detail-accent-ring': habitAccent ?? '#7fa8c9',
        '--habit-detail-accent-ring-dim': habitAccent
            ? `color-mix(in srgb, ${habitAccent} 76%, #14181d)`
            : '#5f8aa8'
    } as CSSProperties;

    // Inline edit surface replaces the read view (mirrors the task editor pattern).
    if (isEditing && habit) {
        return (
            <>
                <HabitEditor
                    habit={habit}
                    isSaving={habitsEdit.isPending}
                    onDelete={() => setIsDeleteModalOpen(true)}
                    onCancel={() => setIsEditing(false)}
                    onSave={(update) =>
                        habitsEdit.mutate(
                            { id: habit.id, update },
                            { onSuccess: () => setIsEditing(false) }
                        )
                    }
                />
                {/* The delete confirm must be reachable from edit mode too — this
                    branch early-returns, so mount the modal here as well. */}
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteHabit={() =>
                        habitsDelete.mutate(habit.id, { onSuccess: onDeleted })
                    }
                />
            </>
        );
    }

    return (
        <div className='flex flex-col gap-6' style={accentVars}>
            {/* Header: name + meta, with a lone Edit affordance top-right.
                No archive/delete on the name's axis — those live in the footer.
                In compact (pane) mode the pane floats a close (X) in the card's
                top-right corner, so pad the header to keep the name/Edit clear of it. */}
            <div className={`flex items-start justify-between gap-4 ${compact ? 'pr-10' : ''}`}>
                <div className='min-w-0'>
                    <h1 className='font-display text-[20px] font-bold tracking-[-0.01em] text-text-primary'>
                        {habit?.name}
                    </h1>
                    {habit && (
                        <div className='mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-[#8ba3b5]'>
                            <span
                                className='h-3 w-3 rounded-[4px]'
                                style={{ background: habit.color }}
                            />
                            <span>{frequencyMeta(habit.frequency, habit.range)}</span>
                            {habit.category && (
                                <>
                                    <span className='text-[#3a4a56]'>·</span>
                                    <span>{habit.category}</span>
                                </>
                            )}
                            <span className='text-[#3a4a56]'>·</span>
                            <span>since {sinceLabel}</span>
                        </div>
                    )}
                </div>
                <button
                    type='button'
                    onClick={() => setIsEditing(true)}
                    aria-label='Edit habit'
                    title='Edit habit'
                    className='shrink-0 rounded-button border p-1.5 text-text-secondary transition-colors hover:text-text-primary'
                    style={{ borderColor: 'var(--habit-container-border)' }}
                >
                    <Pencil size={14} />
                </button>
            </div>

            <KpiBoard kpis={kpisQuery.data} compact={compact} />

            <div
                className={
                    compact
                        ? 'flex flex-col gap-5'
                        : 'grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]'
                }
            >
                <CalendarBoard
                    habit={habit}
                    trackers={trackers}
                    weekStartMonday={weekStartMonday}
                    onTrackerCreate={handleTrackerCreate}
                    onTrackerUpdate={handleTrackerUpdate}
                />
                <div className='flex flex-col gap-5'>
                    <WeekdayChart
                        rates={kpisQuery.data?.weekday_completion_rates}
                        weekStartMonday={weekStartMonday}
                    />
                    <StreakChart streaks={streaksQuery.data ?? []} />
                </div>
            </div>

            {/* Footer: Archive / Delete, separated from the content by a hairline. */}
            {habit && (
                <div
                    className='flex items-center justify-end gap-1.5 border-t pt-4'
                    style={{ borderColor: 'var(--surface-card-border)' }}
                >
                    <button
                        type='button'
                        onClick={() =>
                            habitsEdit.mutate({
                                id: habit.id,
                                update: { archived: !habit.archived }
                            })
                        }
                        className={`${ghostButton} text-text-secondary hover:text-text-primary`}
                        style={{ borderColor: 'var(--habit-container-border)' }}
                    >
                        {habit.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                        {habit.archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                        type='button'
                        onClick={() => setIsDeleteModalOpen(true)}
                        className={`${ghostButton} hover:brightness-125`}
                        style={{
                            borderColor: 'var(--habit-container-border)',
                            color: 'var(--color-danger)'
                        }}
                    >
                        <Trash size={13} />
                        Delete
                    </button>
                </div>
            )}

            {habit && (
                <DeleteHabitModal
                    isOpen={isDeleteModalOpen}
                    habit={habit}
                    onClose={() => setIsDeleteModalOpen(false)}
                    handleDeleteHabit={() =>
                        habitsDelete.mutate(habit.id, { onSuccess: onDeleted })
                    }
                />
            )}
        </div>
    );
};
