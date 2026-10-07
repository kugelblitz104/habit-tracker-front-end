import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export type TaskListSkeletonProps = {
    rows: number;
};

/**
 * Placeholder for the flat task list while `useTasks` loads. Rendered under the
 * page's real header and toolbar, which paint immediately.
 *
 * Mirrors `TaskListView`'s single ungrouped container and `TaskRow`'s geometry
 * at the default `soon` tier: `py-[9px]`, a 24px title line and a 24px meta
 * line. Tier padding ranges from 8px to 12px, so real rows can differ by a few
 * pixels each, but the list does not reflow its structure on arrival.
 */
export const TaskListSkeleton = ({ rows }: TaskListSkeletonProps) => (
    <SkeletonTheme baseColor='var(--surface-card-border)' highlightColor='var(--surface-row-hover)'>
        <div
            className='overflow-hidden rounded-card border'
            style={{
                backgroundColor: 'var(--surface-card-bg)',
                borderColor: 'var(--surface-card-border)'
            }}
        >
            {Array.from({ length: rows }, (_, i) => (
                <div
                    key={i}
                    className={`flex items-start gap-[10px] border-l-[3px] border-transparent py-[9px] pr-[14px] pl-[10px] ${
                        i === 0 ? '' : 'border-t'
                    }`}
                    style={{ borderColor: 'var(--surface-card-border)' }}
                >
                    <div className='flex h-[20.625px] items-center'>
                        <Skeleton className='h-4 w-4 rounded-full' containerClassName='block' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex min-h-[24px] items-center gap-[10px]'>
                            <div className='min-w-0 flex-1'>
                                <Skeleton
                                    className='h-3.5 rounded-full'
                                    containerClassName='block w-3/5'
                                />
                            </div>
                            <span className='flex w-[80px] shrink-0 justify-end'>
                                <Skeleton
                                    className='h-3.5 rounded-full'
                                    containerClassName='block w-12'
                                />
                            </span>
                            <span className='flex w-[20px] shrink-0 justify-end sm:w-[48px]'>
                                <Skeleton
                                    className='h-3.5 rounded-full'
                                    containerClassName='block w-5'
                                />
                            </span>
                        </div>
                        <div className='flex min-h-[24px] items-center'>
                            <Skeleton
                                className='h-3 rounded-full'
                                containerClassName='block w-40 max-w-full'
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </SkeletonTheme>
);
