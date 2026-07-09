import type { HabitKPIs } from '@/api';
import { parseLocalDate } from '@/lib/date-utils';

type KpiBoardProps = {
    kpis?: HabitKPIs;
    /**
     * Compact/pane context (~480px). Lays the 6 cards out as a balanced 3×2
     * grid instead of the full-page 6-across, avoiding an unbalanced 4+2 wrap.
     */
    compact?: boolean;
};

const LABEL = 'font-mono text-[9px] uppercase tracking-[0.1em] text-[#7f93a5]';
const VALUE = 'font-display text-[27px] font-bold leading-none text-[#e6eef4]';
const SUB = 'text-[11px] text-[#7f93a5]';
const CARD =
    'bg-[var(--habit-container-bg)] border border-[var(--habit-container-border)] rounded-[12px] px-3 py-[15px] flex flex-col gap-[5px] items-center text-center';

// Fixed-column grids keep the 6 cards balanced. In the compact pane (~480px) a
// clean 3×2 avoids the unbalanced 4+2 the old auto-fit produced; at full page
// width the cards run 3-across on small screens and 6-across from lg up.
const GRID_CLASS_COMPACT = 'grid grid-cols-3 gap-2.5';
const GRID_CLASS_FULL = 'grid grid-cols-3 gap-2.5 lg:grid-cols-6';

const dateOnly = (dateString: string): string => dateString.split('T')[0] ?? dateString;

const monthShort = (dateString: string): string =>
    parseLocalDate(dateOnly(dateString)).toLocaleDateString('en-US', { month: 'short' });

const formatLastDone = (dateString: string): string =>
    parseLocalDate(dateOnly(dateString)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

const relativeLastDone = (dateString: string): string => {
    const date = parseLocalDate(dateOnly(dateString));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
};

/** Conic-gradient completion ring with a centered percentage label. */
const Ring = ({ fraction, accent }: { fraction: number; accent: string }) => {
    const pct = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
    return (
        <span
            className='flex items-center justify-center rounded-full'
            style={{
                width: 42,
                height: 42,
                background: `conic-gradient(${accent} ${pct}%, rgba(255,255,255,.08) 0)`
            }}
        >
            <span
                className='flex items-center justify-center rounded-full font-semibold'
                style={{ width: 31, height: 31, background: 'var(--bg)', fontSize: 11, color: '#c6d6e2' }}
            >
                {pct}%
            </span>
        </span>
    );
};

export const KpiBoard = ({ kpis, compact = false }: KpiBoardProps) => {
    const gridClass = compact ? GRID_CLASS_COMPACT : GRID_CLASS_FULL;

    if (!kpis) {
        return (
            <div className={gridClass}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`${CARD} h-[86px] animate-pulse opacity-60`} />
                ))}
            </div>
        );
    }

    const longestSub = kpis.longest_streak_end_date
        ? `days · ${monthShort(kpis.longest_streak_end_date)}`
        : 'days';

    return (
        <div className={gridClass}>
            <div className={CARD}>
                <div className={LABEL}>Current</div>
                <div className={VALUE}>{kpis.current_streak}</div>
                <div className={SUB}>day streak</div>
            </div>

            <div className={CARD}>
                <div className={LABEL}>Longest</div>
                <div className={VALUE}>{kpis.longest_streak}</div>
                <div className={SUB}>{longestSub}</div>
            </div>

            <div className={CARD}>
                <div className={LABEL}>Total</div>
                <div className={VALUE}>{kpis.total_completions}</div>
                <div className={SUB}>completions</div>
            </div>

            <div className={CARD}>
                <div className={LABEL}>Last done</div>
                <div className={VALUE}>
                    {kpis.last_completed_date ? formatLastDone(kpis.last_completed_date) : '—'}
                </div>
                <div className={SUB}>
                    {kpis.last_completed_date
                        ? relativeLastDone(kpis.last_completed_date)
                        : 'never'}
                </div>
            </div>

            <div className={`${CARD} gap-[6px]`}>
                <div className={LABEL}>30-day</div>
                <Ring fraction={kpis.thirty_day_completion_rate} accent='#7fa8c9' />
            </div>

            <div className={`${CARD} gap-[6px]`}>
                <div className={LABEL}>Overall</div>
                <Ring fraction={kpis.overall_completion_rate} accent='#5f8aa8' />
            </div>
        </div>
    );
};
