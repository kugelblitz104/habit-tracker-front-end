import type { CountdownRead } from '@/api';
import {
    countdownHero,
    groupColor,
    occurrenceLabel,
    repeatLabel,
    type Countdown
} from '@/features/tasks/utils/countdown';
import { formatCompactTime, formatShortDate } from '@/features/tasks/utils/task-format';
import { parseLocalDate } from '@/lib/date-utils';
import { ExternalLink, Repeat } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type CountdownCardProps = {
    countdown: CountdownRead;
    calc: Countdown;
    now: Date;
    /** When set, the whole card links here (Today: task or /countdown). */
    to?: string;
    linkState?: unknown;
    /** Action controls rendered top-right (e.g. edit/delete on the page). */
    actions?: ReactNode;
};

/**
 * Countdown card with the days-remaining number as the hero — large and up
 * front — over the title + meta (date, category, recurrence, optional Nth
 * occurrence). The hero color reflects urgency; the left border reflects the
 * countdown's own category color.
 */
export const CountdownCard = ({ countdown, calc, now, to, linkState, actions }: CountdownCardProps) => {
    const hero = countdownHero(calc);
    const heroColor = groupColor(calc.group);
    const accent = countdown.color ?? 'var(--surface-card-border)';
    const nth = countdown.show_occurrence
        ? occurrenceLabel(countdown.target_date, countdown.repeat, now)
        : null;
    const rep = repeatLabel(countdown.repeat, countdown.target_date);
    const time = formatCompactTime(countdown.target_time);
    const dateLabel = formatShortDate(parseLocalDate(countdown.target_date));

    const body = (
        <>
            <div className='flex items-baseline gap-1.5'>
                <span
                    className='font-display text-[34px] font-bold leading-none tabular-nums'
                    style={{ color: heroColor }}
                >
                    {hero.value}
                </span>
                {hero.unit && (
                    <span className='font-mono text-[11px] uppercase tracking-[0.08em] text-text-faint'>
                        {hero.unit}
                    </span>
                )}
            </div>
            <div className='mt-2.5 flex items-center gap-1.5'>
                <span className='min-w-0 truncate font-display text-[14px] text-text-secondary'>
                    {countdown.title}
                </span>
                {nth && (
                    <span
                        className='shrink-0 rounded-chip px-1.5 py-0.5 font-mono text-[10px] font-semibold'
                        style={{ color: heroColor, backgroundColor: 'rgba(255,255,255,.06)' }}
                    >
                        {nth}
                    </span>
                )}
                {countdown.task_id != null && !to && (
                    <Link
                        to={`/tasks/${countdown.task_id}`}
                        state={{ from: '/countdown' }}
                        aria-label='Open linked task'
                        title='Open linked task'
                        className='shrink-0 text-text-faint transition-colors hover:text-text-secondary'
                    >
                        <ExternalLink size={12} />
                    </Link>
                )}
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-text-faint'>
                <span>
                    {dateLabel}
                    {time ? ` · ${time}` : ''}
                </span>
                {countdown.category && <span>· {countdown.category}</span>}
                {rep && (
                    <span className='inline-flex items-center gap-0.5'>
                        · <Repeat size={10} /> {rep}
                    </span>
                )}
            </div>
        </>
    );

    const className = 'relative flex min-w-0 flex-col rounded-card border p-4';
    const style: React.CSSProperties = {
        backgroundColor: 'var(--surface-card-bg)',
        borderColor: 'var(--surface-card-border)',
        borderLeft: `3px solid ${accent}`
    };

    if (to) {
        return (
            <Link to={to} state={linkState} className={className} style={style}>
                {body}
            </Link>
        );
    }
    return (
        <div className={className} style={style}>
            {body}
            {actions}
        </div>
    );
};
