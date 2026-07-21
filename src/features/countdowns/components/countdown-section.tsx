import { getCountdown, type CountdownRepeat } from '@/features/tasks/utils/countdown';
import { useAuth } from '@/lib/auth-context';
import { useNow } from '@/lib/use-now';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useCountdowns } from '../api/get-countdowns';
import { COUNTDOWN_RANGE_PRESETS, useCountdownWindow } from '../hooks/use-countdown-window';
import { CountdownCard } from './countdown-card';

const UNCATEGORIZED = 'Other';
const HIDDEN_KEY = 'countdown_hidden_categories';

const catOf = (category: string | null | undefined) => category?.trim() || UNCATEGORIZED;

/**
 * Today's "Countdowns" section — unboxed like the schedule/habits sections.
 * Countdowns (standalone or task-linked) are grouped by category and rendered
 * as cards with the days-remaining number up front. A segmented control sets
 * the look-ahead range and a legend toggles which category groups are shown
 * (both persisted). Hidden when the profile has countdowns disabled or has none.
 */
export const CountdownSection = ({ profileId }: { profileId: number | null | undefined }) => {
    const { activeProfile } = useAuth();
    const now = useNow();
    const query = useCountdowns({ profileId });
    const { windowDays, changeWindow } = useCountdownWindow();

    const [hidden, setHidden] = useState<Set<string>>(new Set());
    useEffect(() => {
        try {
            const raw = localStorage.getItem(HIDDEN_KEY);
            if (raw) setHidden(new Set(JSON.parse(raw) as string[]));
        } catch {
            /* ignore */
        }
    }, []);
    const toggleCategory = (name: string) =>
        setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            try {
                localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
            } catch {
                /* ignore */
            }
            return next;
        });

    const { groups, categories, hasAny } = useMemo(() => {
        const all = (query.data?.countdowns ?? []).map((c) => ({
            c,
            calc: getCountdown(c.target_date, c.target_time, now, c.repeat as CountdownRepeat)!
        }));
        const inRange = all.filter((i) => windowDays == null || i.calc.daysUntil <= windowDays);

        const catColor = new Map<string, string | undefined>();
        for (const i of inRange) {
            const name = catOf(i.c.category);
            if (!catColor.has(name) || (i.c.color && !catColor.get(name))) {
                catColor.set(name, catColor.get(name) || i.c.color || undefined);
            }
        }
        const categories = [...catColor.entries()].map(([name, color]) => ({ name, color }));

        const byCat = new Map<string, typeof inRange>();
        for (const i of inRange) {
            if (hidden.has(catOf(i.c.category))) continue;
            const name = catOf(i.c.category);
            const list = byCat.get(name) ?? [];
            list.push(i);
            byCat.set(name, list);
        }
        const groups = [...byCat.entries()]
            .map(([name, items]) => {
                items.sort((a, b) => a.calc.dueMs - b.calc.dueMs);
                return { name, items, soonest: items[0]!.calc.dueMs };
            })
            .sort((a, b) => a.soonest - b.soonest);

        return { groups, categories, hasAny: all.length > 0 };
    }, [query.data, now, windowDays, hidden]);

    // Feature toggle (mirrors calendar/habits) + nothing-to-show guard.
    if (activeProfile != null && activeProfile.countdowns_enabled === false) return null;
    if (!hasAny) return null;

    return (
        <section className='mb-[30px]'>
            <div className='mb-[13px] flex flex-wrap items-center gap-3'>
                <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                    Countdowns
                </h2>
                <span
                    className='flex items-center gap-0.5 rounded-chip border p-0.5'
                    style={{ borderColor: 'var(--surface-input-border)' }}
                >
                    {COUNTDOWN_RANGE_PRESETS.map((preset) => {
                        const selected = preset.days === windowDays;
                        return (
                            <button
                                key={preset.label}
                                type='button'
                                onClick={() => changeWindow(preset.days)}
                                aria-pressed={selected}
                                className='rounded-chip px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors'
                                style={{
                                    backgroundColor: selected ? 'rgba(255,255,255,.06)' : 'transparent',
                                    color: selected ? 'var(--color-now-accent)' : 'var(--color-text-muted)'
                                }}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </span>
                <span className='flex-1' />
                {categories.map(({ name, color }) => {
                    const isHidden = hidden.has(name);
                    return (
                        <button
                            key={name}
                            type='button'
                            onClick={() => toggleCategory(name)}
                            aria-pressed={!isHidden}
                            title={isHidden ? 'Show this group' : 'Hide this group'}
                            className='inline-flex items-center gap-1.5 font-mono text-[11px] transition-opacity'
                            style={{ color: 'var(--color-text-muted)', opacity: isHidden ? 0.45 : 1 }}
                        >
                            <span
                                className='h-2.5 w-2.5 rounded-full'
                                style={{
                                    backgroundColor: isHidden ? 'transparent' : color ?? 'var(--color-text-faint)',
                                    border: `1.5px solid ${color ?? 'var(--color-text-faint)'}`
                                }}
                            />
                            <span style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>{name}</span>
                        </button>
                    );
                })}
                <Link
                    to='/countdown'
                    className='font-mono text-[11px] text-text-faint transition-colors hover:text-text-secondary'
                >
                    View all
                </Link>
            </div>

            {groups.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    Nothing in this range. Widen it or show a hidden group.
                </p>
            ) : (
                <div className='flex flex-col gap-[18px]'>
                    {groups.map((group) => (
                        <div key={group.name}>
                            <div className='mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-faint'>
                                {group.name}
                            </div>
                            <div className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3'>
                                {group.items.map(({ c, calc }) => (
                                    <CountdownCard
                                        key={c.id}
                                        countdown={c}
                                        calc={calc}
                                        now={now}
                                        to={c.task_id != null ? `/tasks/${c.task_id}` : '/countdown'}
                                        linkState={{ from: '/' }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
