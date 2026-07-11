import type { ReactNode } from 'react';

type DetailPanelProps = {
    /** Mono/display uppercase micro-title. Omit to render only `headerExtra`
     *  (or nothing) as the header. */
    title?: string;
    /** Extra content on the title's row (e.g. the calendar's month pager). */
    headerExtra?: ReactNode;
    /** Extra classes appended to the panel wrapper. */
    className?: string;
    children: ReactNode;
};

const PANEL =
    'bg-[var(--habit-container-bg)] border border-[var(--habit-container-border)] rounded-card px-5 py-[18px]';
const TITLE =
    'm-0 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-habit-label)]';

/**
 * Shared card chrome for the habit-detail analytics panels (streak chart,
 * weekday chart, calendar board): the `--habit-container` bordered card plus
 * the mono/display uppercase micro-title. `headerExtra` lets a consumer (the
 * calendar board) render controls alongside the title without each panel
 * hand-rolling its own header row.
 */
export const DetailPanel = ({ title, headerExtra, className = '', children }: DetailPanelProps) => (
    <div className={className ? `${PANEL} ${className}` : PANEL}>
        {headerExtra ? (
            <div className='mb-[14px] flex items-center justify-between'>
                {title && <h2 className={TITLE}>{title}</h2>}
                {headerExtra}
            </div>
        ) : (
            title && <h2 className={TITLE}>{title}</h2>
        )}
        {children}
    </div>
);
