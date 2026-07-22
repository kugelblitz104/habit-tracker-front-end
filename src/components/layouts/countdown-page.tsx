import type { CountdownRead } from '@/api';
import { AppHeader } from '@/components/layouts/app-header';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { useCreateCountdown } from '@/features/countdowns/api/create-countdowns';
import { useDeleteCountdown } from '@/features/countdowns/api/delete-countdowns';
import { useCountdowns } from '@/features/countdowns/api/get-countdowns';
import { useUpdateCountdown } from '@/features/countdowns/api/update-countdowns';
import { CountdownCard } from '@/features/countdowns/components/countdown-card';
import { selectOptionStyle } from '@/features/tasks/components/task-form-fields';
import {
    COUNTDOWN_GROUPS,
    getCountdown,
    REPEAT_OPTIONS,
    type Countdown,
    type CountdownRepeat
} from '@/features/tasks/utils/countdown';
import { TaskSelect } from '@/features/time-entries/components/task-select';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE, PAGE_WIDTH_TRANSITION, paneRowClass } from '@/lib/layout';
import { useNow } from '@/lib/use-now';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const inputClass =
    'rounded-button border px-2 py-1 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-now-accent placeholder:text-text-faint';
const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-input-bg)',
    borderColor: 'var(--surface-input-border)',
    colorScheme: 'dark'
};
const GRID_CLASS = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';
const labelCls = 'mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

/** Create/edit form for a countdown. `initial` present = edit; absent = create. */
const CountdownForm = ({
    profileId,
    initial,
    onDone,
    onCancel
}: {
    profileId: number;
    initial?: CountdownRead;
    onDone: () => void;
    onCancel?: () => void;
}) => {
    const create = useCreateCountdown();
    const update = useUpdateCountdown();
    const [title, setTitle] = useState(initial?.title ?? '');
    const [date, setDate] = useState(initial?.target_date ?? '');
    const [time, setTime] = useState((initial?.target_time ?? '').slice(0, 5));
    const [taskId, setTaskId] = useState<number | null>(initial?.task_id ?? null);
    const [category, setCategory] = useState(initial?.category ?? '');
    const [color, setColor] = useState(initial?.color ?? '');
    const [repeat, setRepeat] = useState<CountdownRepeat>(
        (initial?.repeat as CountdownRepeat) ?? 'none'
    );
    const [showOccurrence, setShowOccurrence] = useState(initial?.show_occurrence ?? false);

    const isPending = create.isPending || update.isPending;
    const canSave = title.trim().length > 0 && !!date && !isPending;

    const submit = () => {
        if (!canSave) return;
        const data = {
            profile_id: profileId,
            title: title.trim(),
            target_date: date,
            target_time: time || null,
            task_id: taskId,
            category: category.trim() || null,
            color: color || null,
            repeat,
            show_occurrence: showOccurrence
        };
        if (initial) {
            update.mutate(
                { countdownId: initial.id, data },
                {
                    onSuccess: () => {
                        toast.success('Countdown updated');
                        onDone();
                    },
                    onError: () => toast.error('Failed to update countdown.')
                }
            );
        } else {
            create.mutate(data, {
                onSuccess: () => {
                    toast.success('Countdown added');
                    onDone();
                },
                onError: () => toast.error('Failed to add countdown.')
            });
        }
    };

    return (
        <div className='flex flex-col gap-3.5'>
            <div>
                <div className={labelCls}>Title</div>
                <input
                    type='text'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='What are you counting down to?'
                    aria-label='Countdown title'
                    autoFocus
                    className={`${inputClass} w-full`}
                    style={inputStyle}
                />
            </div>

            <div>
                <div className={labelCls}>When</div>
                <div className='flex flex-wrap items-center gap-2'>
                    <input
                        type='date'
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        aria-label='Target date'
                        className={inputClass}
                        style={inputStyle}
                    />
                    <input
                        type='time'
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        aria-label='Target time (optional)'
                        className={inputClass}
                        style={inputStyle}
                    />
                </div>
            </div>

            <div>
                <div className={labelCls}>Repeat</div>
                <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as CountdownRepeat)}
                    aria-label='Repeat'
                    className={`${inputClass} w-full`}
                    style={inputStyle}
                >
                    {REPEAT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} style={selectOptionStyle}>
                            {o.label}
                        </option>
                    ))}
                </select>
                {repeat !== 'none' && (
                    <label className='mt-2 flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-text-muted'>
                        <input
                            type='checkbox'
                            checked={showOccurrence}
                            onChange={(e) => setShowOccurrence(e.target.checked)}
                            className='h-3.5 w-3.5 cursor-pointer accent-[var(--color-now-accent)]'
                        />
                        Count occurrences (e.g. 26th)
                    </label>
                )}
            </div>

            <div>
                <div className={labelCls}>Category / color</div>
                <div className='flex items-center gap-2'>
                    <input
                        type='text'
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder='e.g. Birthdays'
                        aria-label='Category'
                        className={`${inputClass} min-w-0 flex-1`}
                        style={inputStyle}
                    />
                    <input
                        type='color'
                        value={color || '#8a8177'}
                        onChange={(e) => setColor(e.target.value)}
                        aria-label='Color'
                        title='Accent color'
                        className='h-8 w-9 shrink-0 cursor-pointer rounded-button border bg-transparent p-0.5'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    />
                </div>
            </div>

            <div>
                <div className={labelCls}>Linked task</div>
                <TaskSelect
                    profileId={profileId}
                    value={taskId}
                    onChange={setTaskId}
                    disabled={isPending}
                    id={initial ? `countdown-task-${initial.id}` : 'countdown-task-new'}
                />
            </div>

            <div className='flex items-center justify-end gap-2 pt-1'>
                {onCancel && (
                    <button
                        type='button'
                        onClick={onCancel}
                        className='rounded-button px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-secondary'
                    >
                        Cancel
                    </button>
                )}
                <button
                    type='button'
                    onClick={submit}
                    disabled={!canSave}
                    className='rounded-button px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-bg transition-opacity disabled:opacity-40'
                    style={{ background: 'var(--button-primary-gradient)' }}
                >
                    {initial ? 'Save' : 'Add'}
                </button>
            </div>
        </div>
    );
};

/** A read-only countdown card in the grid, with edit/delete controls. */
const CountdownGridItem = ({
    countdown,
    calc,
    now,
    onEdit
}: {
    countdown: CountdownRead;
    calc: Countdown;
    now: Date;
    onEdit: () => void;
}) => {
    const del = useDeleteCountdown();

    const handleDelete = () => {
        if (del.isPending) return;
        if (!window.confirm(`Delete countdown "${countdown.title}"?`)) return;
        del.mutate(countdown.id, {
            onSuccess: () => toast.success('Countdown deleted'),
            onError: () => toast.error('Failed to delete countdown.')
        });
    };

    return (
        <CountdownCard
            countdown={countdown}
            calc={calc}
            now={now}
            actions={
                <div className='absolute right-2 top-2 flex items-center gap-1'>
                    <button
                        type='button'
                        onClick={onEdit}
                        aria-label='Edit countdown'
                        className='text-text-faint transition-colors hover:text-text-secondary'
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        type='button'
                        onClick={handleDelete}
                        disabled={del.isPending}
                        aria-label='Delete countdown'
                        className='text-text-faint transition-colors hover:text-danger disabled:opacity-50'
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            }
        />
    );
};

/**
 * Countdown surface: the profile's countdowns (standalone or task-linked), as
 * cards with the days-remaining number up front. Grouped by time-to-target or
 * by category (toggle). Labels are live (re-computed each minute via useNow).
 */
export const CountdownDashboard = () => {
    const { activeProfileId, activeProfile } = useAuth();
    const profileId = activeProfileId ?? undefined;
    const now = useNow();

    const countdownsQuery = useCountdowns({ profileId });
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<CountdownRead | null>(null);
    const [groupMode, setGroupMode] = useState<'time' | 'category'>('time');
    const closePane = () => {
        setCreating(false);
        setEditing(null);
    };

    const layout = useResponsiveLayout();
    const isWide = layout === 'lg' || layout === 'xl';
    const paneOpen = creating || editing !== null;
    const showPane = isWide && paneOpen;

    const { items, byGroup, total, overdueCount } = useMemo(() => {
        const items = (countdownsQuery.data?.countdowns ?? []).map((c) => ({
            countdown: c,
            calc: getCountdown(c.target_date, c.target_time, now, c.repeat as CountdownRepeat)!
        }));
        const map = new Map<string, typeof items>();
        for (const item of items) {
            const list = map.get(item.calc.group) ?? [];
            list.push(item);
            map.set(item.calc.group, list);
        }
        for (const list of map.values()) list.sort((a, b) => a.calc.dueMs - b.calc.dueMs);
        return {
            items,
            byGroup: map,
            total: items.length,
            overdueCount: map.get('overdue')?.length ?? 0
        };
    }, [countdownsQuery.data, now]);

    const categorySections = useMemo(() => {
        const map = new Map<string, { color?: string; items: typeof items }>();
        for (const item of items) {
            const name = item.countdown.category?.trim() || 'Other';
            const entry = map.get(name) ?? { color: item.countdown.color ?? undefined, items: [] };
            entry.items.push(item);
            map.set(name, entry);
        }
        return [...map.entries()]
            .map(([name, entry]) => {
                entry.items.sort((a, b) => a.calc.dueMs - b.calc.dueMs);
                return { name, color: entry.color, items: entry.items, soonest: entry.items[0]!.calc.dueMs };
            })
            .sort((a, b) => a.soonest - b.soonest);
    }, [items]);

    const disabled = activeProfile != null && activeProfile.countdowns_enabled === false;

    const sections =
        groupMode === 'time'
            ? COUNTDOWN_GROUPS.map((g) => ({
                  key: g.key,
                  label: g.label,
                  color: g.color,
                  rows: byGroup.get(g.key) ?? []
              }))
            : categorySections.map((s) => ({
                  key: `cat-${s.name}`,
                  label: s.name,
                  color: s.color ?? 'var(--color-text-faint)',
                  rows: s.items
              }));

    const paneTitle = editing ? 'Edit countdown' : 'New countdown';
    const formEl = activeProfileId ? (
        <CountdownForm
            key={editing?.id ?? 'new'}
            profileId={activeProfileId}
            initial={editing ?? undefined}
            onDone={closePane}
            onCancel={!isWide ? closePane : undefined}
        />
    ) : null;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH} />
            <div
                className={`mx-auto px-5 py-7 md:px-7 ${PAGE_WIDTH_TRANSITION} ${showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH}`}
            >
                <div className={paneRowClass(isWide, showPane, 400)}>
                    <div className='min-w-0 flex-1'>
                <header className='mb-[24px] flex items-start justify-between gap-3'>
                    <div>
                        <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                            Countdown
                        </h1>
                        <div className='mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px]'>
                            <span className='text-text-muted'>
                                {total} {total === 1 ? 'countdown' : 'countdowns'}
                            </span>
                            {overdueCount > 0 && (
                                <>
                                    <span className='text-text-faint'>·</span>
                                    <span style={{ color: 'var(--color-danger)' }}>
                                        {overdueCount} overdue
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    {!disabled && (
                        <div className='flex shrink-0 items-center gap-2'>
                            {total > 0 && (
                                <span
                                    className='flex items-center gap-0.5 rounded-chip border p-0.5'
                                    style={{ borderColor: 'var(--surface-input-border)' }}
                                >
                                    {(['time', 'category'] as const).map((mode) => {
                                        const selected = groupMode === mode;
                                        return (
                                            <button
                                                key={mode}
                                                type='button'
                                                onClick={() => setGroupMode(mode)}
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
                                                {mode}
                                            </button>
                                        );
                                    })}
                                </span>
                            )}
                            {activeProfileId && (
                                <button
                                    type='button'
                                    onClick={() => setCreating(true)}
                                    className='flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono text-[11px] text-text-secondary transition-colors hover:text-text-primary'
                                    style={inputStyle}
                                >
                                    <Plus size={13} />
                                    New countdown
                                </button>
                            )}
                        </div>
                    )}
                </header>

                {disabled ? (
                    <p className='font-mono text-[12px] text-text-faint'>
                        Countdowns are turned off for this profile. Enable them in Settings.
                    </p>
                ) : (
                    <>
                        {countdownsQuery.isError ? (
                            <p className='font-mono text-[12px] text-danger'>
                                Failed to load countdowns.
                            </p>
                        ) : countdownsQuery.isLoading ? (
                            <p className='font-mono text-[12px] text-text-faint'>Loading…</p>
                        ) : total === 0 ? (
                            <p className='font-mono text-[12px] text-text-faint'>
                                No countdowns yet. Add one to track a deadline — with or without a task.
                            </p>
                        ) : (
                            <div className='flex flex-col gap-[26px]'>
                                {sections.map((section) => {
                                    if (section.rows.length === 0) return null;
                                    return (
                                        <section key={section.key}>
                                            <div className='mb-2.5 flex items-center gap-2'>
                                                <span
                                                    className='h-2 w-2 rounded-full'
                                                    style={{ backgroundColor: section.color }}
                                                />
                                                <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted'>
                                                    {section.label}
                                                </h2>
                                                <span className='font-mono text-[11px] text-text-faint'>
                                                    {section.rows.length}
                                                </span>
                                            </div>
                                            <div className={GRID_CLASS}>
                                                {section.rows.map(({ countdown, calc }) => (
                                                    <CountdownGridItem
                                                        key={countdown.id}
                                                        countdown={countdown}
                                                        calc={calc}
                                                        now={now}
                                                        onEdit={() => setEditing(countdown)}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
                    </div>

                    {showPane && (
                        // Fills (and clips) the grid pane track that animates
                        // 0 -> 400px; the fixed-width card inner keeps its layout
                        // steady. `pane-rise` (on the scroll container, so its
                        // transform doesn't flash a scrollbar) floats it up into
                        // place, and the key replays that on switching targets.
                        <aside
                            key={editing?.id ?? 'new'}
                            className='pane-rise sticky top-7 max-h-[calc(100vh-3.5rem)] w-full min-w-0 overflow-x-hidden overflow-y-auto'
                        >
                            <div
                                className='w-[400px] rounded-card border p-4'
                                style={{
                                    backgroundColor: 'var(--surface-card-bg)',
                                    borderColor: 'var(--surface-card-border)'
                                }}
                            >
                                <div className='mb-3 flex items-center justify-between'>
                                    <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-habit-label'>
                                        {paneTitle}
                                    </h2>
                                    <button
                                        type='button'
                                        onClick={closePane}
                                        aria-label='Close'
                                        className='text-text-faint transition-colors hover:text-text-secondary'
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                                {formEl}
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            {/* Narrow screens have no room for a side pane — use a modal. */}
            {!isWide && (
                <BaseModal
                    isOpen={paneOpen}
                    onClose={closePane}
                    title={paneTitle}
                    panelClassName='max-w-lg'
                >
                    {formEl}
                </BaseModal>
            )}
        </div>
    );
};
