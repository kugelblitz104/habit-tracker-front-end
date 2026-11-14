import { SegmentedControl } from '@/components/ui/segmented-control';
import type { RangeDays } from '../utils/insights-utils';

const OPTIONS: { value: RangeDays; label: string }[] = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' }
];

/**
 * Segmented 7 / 30 / 90-day control. The active segment fills with the primary
 * gradient (matching the Today hub pill); the rest are quiet ghosts.
 */
export const RangeToggle = ({
    value,
    onChange
}: {
    value: RangeDays;
    onChange: (value: RangeDays) => void;
}) => {
    return (
        <SegmentedControl
            role='tablist'
            aria-label='Time range'
            className='inline-flex items-center gap-1 rounded-chip p-1'
            style={{ backgroundColor: 'rgba(255,255,255,.06)' }}
            highlightStyle={{ background: 'var(--button-primary-gradient)' }}
        >
            {OPTIONS.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type='button'
                        role='tab'
                        aria-selected={active}
                        onClick={() => onChange(opt.value)}
                        className='min-h-[30px] rounded-chip px-3 py-1.5 font-display text-body font-semibold transition-opacity pointer-coarse:min-h-[44px] hover:opacity-90'
                        style={{
                            color: active ? 'var(--button-primary-text)' : 'var(--color-text-muted)'
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </SegmentedControl>
    );
};
