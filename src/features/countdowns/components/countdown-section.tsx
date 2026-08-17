import {
    applyPastRule,
    getCountdown,
    type CountdownRepeat
} from '@/features/countdowns/utils/countdown';
import { useAuth } from '@/lib/auth-context';
import { useNow } from '@/lib/use-now';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useCountdownCategories } from '../api/get-countdown-categories';
import { useCountdowns } from '../api/get-countdowns';
import { COUNTDOWN_RANGE_PRESETS, useCountdownWindow } from '../hooks/use-countdown-window';
import {
    buildCategoryColorMap,
    buildCategoryNameMap,
    colorOf,
    nameOf
} from '../utils/category-colors';
import { CountdownCard } from './countdown-card';

const HIDDEN_KEY = 'countdown_hidden_categories';

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
    const categoryQuery = useCountdownCategories({ profileId });
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
    const toggleCategory = (categoryId: number | null) => {
        const key = String(categoryId ?? 'none');
        setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            try {
                localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
            } catch {
                /* ignore */
            }
            return next;
        });
    };

    const { groups, categories, colorFor, nameFor, hasAny } = useMemo(() => {
        const all = (query.data?.countdowns ?? [])
            .map((c) => ({
                c,
                calc: applyPastRule(
                    getCountdown(c.target_date, c.target_time, now, c.repeat as CountdownRepeat)!,
                    c.task_id
                )
            }))
            // A look-ahead window has no business holding countdowns that have
            // already gone; the Past band on /countdown is where they live.
            .filter((i) => i.calc.group !== 'past');
        const inRange = all.filter((i) => windowDays == null || i.calc.daysUntil <= windowDays);

        // Groups come from the countdowns in range, never from the categories
        // list, so a group with nothing in range stays invisible. The key is
        // the category id, so a group named "Other" is its own section rather
        // than merging with the ungrouped ones.
        const colorFor = buildCategoryColorMap(categoryQuery.data?.categories ?? []);
        const nameFor = buildCategoryNameMap(categoryQuery.data?.categories ?? []);
        const byCat = new Map<number | null, typeof inRange>();
        for (const i of inRange) {
            const key = i.c.category_id ?? null;
            const list = byCat.get(key) ?? [];
            list.push(i);
            byCat.set(key, list);
        }
        const categories = [...byCat.entries()].map(([categoryId]) => ({
            categoryId,
            name: nameOf(nameFor, categoryId),
            color: colorOf(colorFor, categoryId)
        }));

        const groups = [...byCat.entries()]
            .filter(([categoryId]) => !hidden.has(String(categoryId ?? 'none')))
            .map(([categoryId, items]) => {
                items.sort((a, b) => a.calc.dueMs - b.calc.dueMs);
                return {
                    categoryId,
                    name: nameOf(nameFor, categoryId),
                    items,
                    soonest: items[0]!.calc.dueMs
                };
            })
            .sort((a, b) => a.soonest - b.soonest);

        return { groups, categories, colorFor, nameFor, hasAny: all.length > 0 };
    }, [query.data, categoryQuery.data, now, windowDays, hidden]);

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
                                    backgroundColor: selected
                                        ? 'rgba(255,255,255,.06)'
                                        : 'transparent',
                                    color: selected
                                        ? 'var(--color-now-accent)'
                                        : 'var(--color-text-muted)'
                                }}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </span>
                {/* One `ml-auto` group rather than a `flex-1` spacer before the
                    chips: inside a wrapping row the spacer absorbs the first
                    row's slack, stranding whichever chip still fits out at the
                    right while its siblings wrap below. `ml-auto` gives the same
                    right-push on wide screens and keeps the legend together. */}
                <div className='ml-auto flex flex-wrap items-center gap-3'>
                    {categories.map(({ categoryId, name, color }) => {
                        const key = String(categoryId ?? 'none');
                        const isHidden = hidden.has(key);
                        return (
                            <button
                                key={key}
                                type='button'
                                onClick={() => toggleCategory(categoryId)}
                                aria-pressed={!isHidden}
                                title={isHidden ? 'Show this group' : 'Hide this group'}
                                className='inline-flex items-center gap-1.5 font-mono text-[11px] transition-opacity'
                                style={{
                                    color: 'var(--color-text-muted)',
                                    opacity: isHidden ? 0.45 : 1
                                }}
                            >
                                <span
                                    className='h-2.5 w-2.5 rounded-full'
                                    style={{
                                        backgroundColor: isHidden
                                            ? 'transparent'
                                            : (color ?? 'var(--color-text-faint)'),
                                        border: `1.5px solid ${color ?? 'var(--color-text-faint)'}`
                                    }}
                                />
                                <span
                                    style={{ textDecoration: isHidden ? 'line-through' : 'none' }}
                                >
                                    {name}
                                </span>
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
            </div>

            {groups.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    Nothing in this range. Widen it or show a hidden group.
                </p>
            ) : (
                <div className='flex flex-col gap-[18px]'>
                    {groups.map((group) => (
                        <div key={`cat-${group.categoryId ?? 'none'}`}>
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
                                        to={
                                            c.task_id != null ? `/tasks/${c.task_id}` : '/countdown'
                                        }
                                        linkState={{ from: '/' }}
                                        categoryColor={colorOf(colorFor, c.category_id)}
                                        categoryName={
                                            c.category_id != null
                                                ? nameFor.get(c.category_id)
                                                : undefined
                                        }
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
