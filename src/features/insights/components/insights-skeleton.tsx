import type { ReactNode } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { CARD_SURFACE_CLASS, CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';

/** Matches `HABIT_ROWS` in `use-insights-data.ts`, the most rows the habit card shows. */
const HABIT_ROWS = 5;
/** Matches `height` on the bar chart containers and the pie chart container. */
const BAR_HEIGHT = 200;
const PIE_SIZE = 160;

/**
 * Placeholder for the Insights page while its queries load. It renders inside
 * the page so the header and range toggle paint immediately.
 *
 * Each box is sized from the real component it stands in for: the stat cards
 * use the same padding and line boxes, each chart body is the height of its
 * chart, and the habit card holds the 5-row cap. Pixel heights in the wrappers
 * are the Tailwind line heights of the real text (1.5 body, `leading-none` on
 * the stat value).
 */
export const InsightsSkeleton = () => (
    <SkeletonTheme baseColor='rgba(120,168,205,.15)' highlightColor='rgba(120,168,205,.28)'>
        <div className='flex flex-col gap-5'>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
                {Array.from({ length: 5 }, (_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
                <ChartCardSkeleton>
                    <div style={{ height: BAR_HEIGHT }}>
                        <Skeleton
                            containerClassName='block h-full'
                            className='h-full rounded-card'
                        />
                    </div>
                </ChartCardSkeleton>
                <ChartCardSkeleton>
                    <div style={{ height: BAR_HEIGHT }}>
                        <Skeleton
                            containerClassName='block h-full'
                            className='h-full rounded-card'
                        />
                    </div>
                </ChartCardSkeleton>
                <ChartCardSkeleton>
                    <ul className='flex flex-col gap-3'>
                        {Array.from({ length: HABIT_ROWS }, (_, i) => (
                            <li key={i}>
                                <div className='mb-1 h-[19.5px]'>
                                    <Skeleton containerClassName='block' className='h-2.5 w-32' />
                                </div>
                                <Skeleton containerClassName='block' className='h-2 rounded-full' />
                            </li>
                        ))}
                    </ul>
                </ChartCardSkeleton>
                <ChartCardSkeleton>
                    <div className='flex flex-wrap items-center gap-4'>
                        <div className='shrink-0' style={{ width: PIE_SIZE, height: PIE_SIZE }}>
                            <Skeleton circle containerClassName='block h-full' className='h-full' />
                        </div>
                        <ul className='flex min-w-0 flex-1 flex-col gap-1.5'>
                            {Array.from({ length: 6 }, (_, i) => (
                                <li key={i} className='flex h-[21.25px] items-center'>
                                    <Skeleton
                                        containerClassName='block w-full'
                                        className='h-2.5 w-full'
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                </ChartCardSkeleton>
            </div>
        </div>
    </SkeletonTheme>
);

/** Heights: border 2 + padding 32 + label 15 + value (mt-2) 8 + 26 + sub (mt-1) 4 + 16.5 = 103.5px. */
const StatCardSkeleton = () => (
    <div className={CARD_SURFACE_CLASS} style={CARD_SURFACE_STYLE}>
        <div className='h-[15px]'>
            <Skeleton containerClassName='block' className='h-2.5 w-20' />
        </div>
        <div className='mt-2 h-[26px]'>
            <Skeleton containerClassName='block h-full' className='h-6 w-16' />
        </div>
        <div className='mt-1 h-[16.5px]'>
            <Skeleton containerClassName='block' className='h-2.5 w-24' />
        </div>
    </div>
);

const ChartCardSkeleton = ({ children }: { children: ReactNode }) => (
    <section className={CARD_SURFACE_CLASS} style={CARD_SURFACE_STYLE}>
        <div className='mb-3 flex h-[16.5px] items-center justify-between'>
            <Skeleton containerClassName='block' className='h-2.5 w-28' />
            <Skeleton containerClassName='block' className='h-2.5 w-14' />
        </div>
        {children}
    </section>
);
