type WeekdayChartProps = {
    /**
     * Length-7 completion rates (0.0–1.0) indexed by Python weekday
     * (0 = Monday … 6 = Sunday), exactly as the server returns them.
     */
    rates?: number[];
    /** Profile preference: columns render Monday-first (default) or Sunday-first. */
    weekStartMonday?: boolean;
};

const PANEL =
    'bg-[var(--habit-container-bg)] border border-[var(--habit-container-border)] rounded-card px-5 py-[18px]';
const TITLE =
    'm-0 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-habit-label)]';

// Rates are indexed by Python weekday (Mon = 0 … Sun = 6), so each display
// column carries the `py` index it reads from. Monday-first columns read
// rates[i] directly; Sunday-first just moves the Sunday column (rates[6]) up
// front.
const DISPLAY_MONDAY_FIRST = [
    { label: 'M', py: 0 },
    { label: 'T', py: 1 },
    { label: 'W', py: 2 },
    { label: 'T', py: 3 },
    { label: 'F', py: 4 },
    { label: 'S', py: 5 },
    { label: 'S', py: 6 }
];
const DISPLAY_SUNDAY_FIRST = [
    { label: 'S', py: 6 },
    { label: 'M', py: 0 },
    { label: 'T', py: 1 },
    { label: 'W', py: 2 },
    { label: 'T', py: 3 },
    { label: 'F', py: 4 },
    { label: 'S', py: 5 }
];

export const WeekdayChart = ({ rates, weekStartMonday = true }: WeekdayChartProps) => {
    const display = weekStartMonday ? DISPLAY_MONDAY_FIRST : DISPLAY_SUNDAY_FIRST;
    const safeRates = rates && rates.length === 7 ? rates : new Array(7).fill(0);
    const maxRate = Math.max(...safeRates, 0);
    // A day is "strong" (accent) when it clears half of the best weekday; below
    // that it reads as a weak spot in a muted blue.
    const strongThreshold = maxRate * 0.5;

    return (
        <div className={PANEL}>
            <h2 className={TITLE}>By weekday</h2>
            <div className='mt-4 flex h-[92px] items-end gap-[9px]'>
                {display.map((col, i) => {
                    const rate = safeRates[col.py] ?? 0;
                    const isStrong = maxRate > 0 && rate >= strongThreshold;
                    return (
                        <div
                            key={i}
                            className='flex h-full flex-1 flex-col items-center justify-end gap-[7px]'
                        >
                            <div
                                className='w-full max-w-[24px] rounded-t-[4px]'
                                style={{
                                    height: `${Math.round(rate * 100)}%`,
                                    minHeight: rate > 0 ? 3 : 0,
                                    background: isStrong
                                        ? 'var(--habit-detail-accent, #6f9dc0)'
                                        : 'var(--habit-detail-accent-soft, #3f5a6b)'
                                }}
                                title={`${Math.round(rate * 100)}%`}
                            />
                            <span
                                className='font-mono text-[10px]'
                                style={{ color: isStrong ? '#8ba3b5' : '#5f7688' }}
                            >
                                {col.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
