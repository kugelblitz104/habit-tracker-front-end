import type { TaskBand } from '@/types/types';

type PriorityMeterProps = {
    /** 0 none / 1 low / 2 medium / 3 high — count of filled segments. */
    priority: number;
    band: Exclude<TaskBand, 'hidden'>;
};

/** Filled-segment color per band (hot in Now, amber in Soon, dim in Whenever). */
const FILL_BY_BAND: Record<Exclude<TaskBand, 'hidden'>, string> = {
    now: 'var(--color-now-meter)',
    soon: 'var(--color-soon-meter)',
    whenever: 'var(--color-whenever-ring)'
};

const DIM_BY_BAND: Record<Exclude<TaskBand, 'hidden'>, string> = {
    now: 'var(--priority-dim)',
    soon: 'var(--priority-dim-soft)',
    whenever: 'var(--priority-dim-soft)'
};

/**
 * Three vertical bars; the leftmost `priority` bars are filled. Rendered on the
 * far right of every task card/row.
 */
export const PriorityMeter = ({ priority, band }: PriorityMeterProps) => {
    const fill = FILL_BY_BAND[band];
    const dim = DIM_BY_BAND[band];
    const height = band === 'now' ? 18 : band === 'soon' ? 15 : 13;
    // Ascending bar-chart heights (~55% / ~78% / 100% of the band height), bottom-aligned.
    const barHeights = [Math.round(height * 0.55), Math.round(height * 0.78), height];

    return (
        <div
            className='flex shrink-0 items-end gap-[3px]'
            role='img'
            aria-label={`Priority ${priority} of 3`}
        >
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className='w-[3px] rounded-full'
                    style={{
                        height: barHeights[i],
                        backgroundColor: i < priority ? fill : dim
                    }}
                />
            ))}
        </div>
    );
};
