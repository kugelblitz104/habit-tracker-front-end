import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export type HabitListSkeletonProps = {
    rows: number;
    days: number;
    isSmall?: boolean;
};

/**
 * Placeholder for `HabitList` while `useHabits` is loading, rendered inside
 * `PageShell` so the header, capture bar and filter bar paint immediately
 * instead of waiting behind a full-page loading state.
 *
 * The structure is the point, not the shimmer: it mirrors `HabitList`'s
 * toolbar row, column layout, borders and `h-12` row height so nothing shifts
 * when the real table arrives. A placeholder of the wrong height just trades
 * one layout shift for another. `rows` comes from the profile's remembered
 * habit count, so the table is usually the right height too.
 *
 * The theme lives here rather than in a root provider because this is the
 * only consumer so far. Hoist it to the app root when a second page grows a
 * skeleton, rather than repeating the two colours.
 */
export const HabitListSkeleton = ({ rows, days, isSmall = false }: HabitListSkeletonProps) => (
    <SkeletonTheme baseColor='rgba(120,168,205,.15)' highlightColor='rgba(120,168,205,.28)'>
        <div className='flex flex-col gap-4'>
            <div
                className='
                    flex
                    flex-wrap-reverse md:flex-row
                    items-start sm:items-center
                    gap-4 sm:justify-between
                '
            >
                <div className='flex w-full flex-wrap items-center gap-2 md:w-auto'>
                    <Skeleton
                        className='h-9 rounded-chip pointer-coarse:h-11'
                        containerClassName='w-20'
                    />
                    <Skeleton
                        className='h-9 rounded-chip pointer-coarse:h-11'
                        containerClassName='w-[74px]'
                    />
                    <Skeleton
                        className='h-9 rounded-chip pointer-coarse:h-11'
                        containerClassName='w-36'
                    />
                </div>
                <Skeleton
                    className='h-9 rounded-button pointer-coarse:h-11'
                    containerClassName='w-full md:w-64'
                />
            </div>
            <div className='overflow-hidden rounded-card border border-[var(--habit-container-border)] bg-[var(--habit-container-bg)]'>
                <div className='overflow-x-auto'>
                    <table className='min-w-full table-auto'>
                        <thead>
                            <tr className='border-b border-[var(--habit-container-border)]'>
                                <th
                                    scope='col'
                                    className={`px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-habit-label)] ${
                                        isSmall ? 'w-[42%] max-w-[42%]' : 'w-1/4'
                                    }`}
                                >
                                    Habit
                                </th>
                                {!isSmall && (
                                    <th
                                        scope='col'
                                        className='w-12 py-3 text-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-habit-label)]'
                                    >
                                        Streak
                                    </th>
                                )}
                                {Array.from({ length: days }, (_, i) => (
                                    <th key={i} scope='col' className='w-9 py-3' />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: rows }, (_, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className='h-12 border-b border-[rgba(120,168,205,.08)] align-middle last:border-b-0'
                                >
                                    <td className='px-4'>
                                        <Skeleton
                                            className='h-3.5 rounded-full'
                                            containerClassName='block w-24'
                                        />
                                    </td>
                                    {!isSmall && (
                                        <td className='text-center'>
                                            <Skeleton
                                                className='h-3.5 rounded-full'
                                                containerClassName='mx-auto block w-4'
                                            />
                                        </td>
                                    )}
                                    {Array.from({ length: days }, (_, dayIndex) => (
                                        <td className='text-center' key={dayIndex}>
                                            <Skeleton
                                                className='h-7 rounded-cell'
                                                containerClassName='mx-auto block w-7'
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </SkeletonTheme>
);
