type PriorityMeterProps = {
    /** 0 none / 1 low / 2 medium / 3 high: count of filled segments. */
    priority: number;
};

/** Ascending bar heights, bottom-aligned. One size at every tier so the
 *  priority column stays aligned down the list. */
const BAR_HEIGHTS = [5, 8, 11];

/**
 * Three vertical bars; the leftmost `priority` bars are filled. Filled bars take
 * `currentColor`, so the caller's colour flows in. Always `aria-hidden`: a text
 * label accompanies it in both the row and the detail panel.
 */
export const PriorityMeter = ({ priority }: PriorityMeterProps) => (
    <div
        className='flex shrink-0 items-end gap-[2px]'
        aria-hidden='true'
        data-testid='priority-meter'
    >
        {[0, 1, 2].map((i) => (
            <span
                key={i}
                className='w-[3px] rounded-full'
                style={{
                    height: BAR_HEIGHTS[i],
                    backgroundColor: i < priority ? 'currentColor' : 'var(--priority-dim-soft)'
                }}
            />
        ))}
    </div>
);
