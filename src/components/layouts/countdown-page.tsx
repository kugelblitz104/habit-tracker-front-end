import type { CountdownRead } from '@/api';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { Button } from '@/components/ui/buttons/button';
import { DetailPane } from '@/components/layouts/detail-pane';
import { PageShell } from '@/components/layouts/page-shell';
import { QueryState } from '@/components/ui/query-state';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { useCreateCountdown } from '@/features/countdowns/api/create-countdowns';
import { useCountdownCategories } from '@/features/countdowns/api/get-countdown-categories';
import { useDeleteCountdown } from '@/features/countdowns/api/delete-countdowns';
import { useCountdowns } from '@/features/countdowns/api/get-countdowns';
import { useUpdateCountdown } from '@/features/countdowns/api/update-countdowns';
import { CountdownCard } from '@/features/countdowns/components/countdown-card';
import { ManageCategoriesModal } from '@/features/countdowns/components/modals/manage-categories-modal';
import { compactFieldClass, compactFieldStyle } from '@/components/ui/forms/form-field-styles';
import { SelectOption } from '@/components/ui/forms/select-option';
import {
    applyPastRule,
    COUNTDOWN_GROUPS,
    getCountdown,
    groupColor,
    REPEAT_OPTIONS,
    type Countdown,
    type CountdownRepeat
} from '@/features/countdowns/utils/countdown';
import {
    buildCategoryColorMap,
    buildCategoryNameMap,
    colorOf,
    nameOf
} from '@/features/countdowns/utils/category-colors';
import { CategoryField } from '@/features/countdowns/components/category-field';
import { TaskSelect } from '@/features/time-entries/components/task-select';
import { useAuth } from '@/lib/auth-context';
import { useNow } from '@/lib/use-now';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import {
    Archive,
    ArchiveRestore,
    ChevronDown,
    ChevronRight,
    Pencil,
    Plus,
    Tags,
    Trash2,
    X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const inputClass = `${compactFieldClass} placeholder:text-text-faint`;
const inputStyle = compactFieldStyle;
const GRID_CLASS = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';
const labelCls =
    'mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

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
    const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null);
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
            category_id: categoryId,
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
                        <SelectOption key={o.value} value={o.value}>
                            {o.label}
                        </SelectOption>
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

            <CategoryField profileId={profileId} value={categoryId} onChange={setCategoryId} />

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
                    <Button
                        size='sm'
                        variant='subtle'
                        onClick={onCancel}
                        className='font-mono uppercase tracking-[0.08em] text-text-muted'
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    size='sm'
                    variant='primary'
                    onClick={submit}
                    disabled={!canSave}
                    className='font-mono uppercase tracking-[0.08em]'
                >
                    {initial ? 'Save' : 'Add'}
                </Button>
            </div>
        </div>
    );
};

/** A read-only countdown card in the grid, with edit/archive/delete controls. */
const CountdownGridItem = ({
    countdown,
    calc,
    now,
    onEdit,
    categoryColor,
    categoryName
}: {
    countdown: CountdownRead;
    calc: Countdown;
    now: Date;
    onEdit: () => void;
    categoryColor?: string;
    categoryName?: string;
}) => {
    const del = useDeleteCountdown();
    const update = useUpdateCountdown();
    const isArchived = countdown.archived_date != null;

    const handleDelete = () => {
        if (del.isPending) return;
        if (!window.confirm(`Delete countdown "${countdown.title}"?`)) return;
        del.mutate(countdown.id, {
            onSuccess: () => toast.success('Countdown deleted'),
            onError: () => toast.error('Failed to delete countdown.')
        });
    };

    const handleArchive = () => {
        if (update.isPending) return;
        update.mutate(
            { countdownId: countdown.id, data: { archived: !isArchived } },
            {
                onSuccess: () =>
                    toast.success(isArchived ? 'Countdown restored' : 'Countdown archived'),
                onError: () =>
                    toast.error(
                        isArchived ? 'Failed to restore countdown.' : 'Failed to archive countdown.'
                    )
            }
        );
    };

    return (
        <CountdownCard
            countdown={countdown}
            calc={calc}
            now={now}
            categoryColor={categoryColor}
            categoryName={categoryName}
            actions={
                // gap-2, not gap-1: each control is now a 44px touch target on a
                // coarse pointer, and the old 8px gap would overlap them.
                <div className='absolute right-2 top-2 flex items-center gap-2'>
                    <Button size='sm' variant='icon' onClick={onEdit} aria-label='Edit countdown'>
                        <Pencil size={14} />
                    </Button>
                    <Button
                        size='sm'
                        variant='icon'
                        onClick={handleArchive}
                        disabled={update.isPending}
                        aria-label={isArchived ? 'Restore countdown' : 'Archive countdown'}
                    >
                        {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    </Button>
                    <Button
                        size='sm'
                        variant='icon'
                        onClick={handleDelete}
                        disabled={del.isPending}
                        aria-label='Delete countdown'
                    >
                        <Trash2 size={14} />
                    </Button>
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

    const [showArchived, setShowArchived] = useState(false);
    const countdownsQuery = useCountdowns({ profileId, archived: showArchived });
    const categoryQuery = useCountdownCategories({ profileId });
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<CountdownRead | null>(null);
    const [groupMode, setGroupMode] = useState<'time' | 'category'>('time');
    const [pastOpen, setPastOpen] = useState(false);
    const [managingCategories, setManagingCategories] = useState(false);
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
            // applyPastRule is what keeps a task-less countdown out of Overdue
            // once its day has gone; it lands in the Past band instead.
            calc: applyPastRule(
                getCountdown(c.target_date, c.target_time, now, c.repeat as CountdownRepeat)!,
                c.task_id
            )
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

    // Shared by the category sections and by every card, which needs its own
    // category's colour in both group modes.
    const colorFor = useMemo(
        () => buildCategoryColorMap(categoryQuery.data?.categories ?? []),
        [categoryQuery.data]
    );
    const nameFor = useMemo(
        () => buildCategoryNameMap(categoryQuery.data?.categories ?? []),
        [categoryQuery.data]
    );

    const categorySections = useMemo(() => {
        // Sections come from the countdowns themselves, never from the categories
        // list, so a group with no countdowns stays invisible. The key is the
        // category id, so a group named "Other" is its own section rather than
        // merging with the ungrouped ones.
        const map = new Map<number | null, typeof items>();
        for (const item of items) {
            // Past ones collect in their own band instead, so switching group
            // mode cannot resurrect them into a category section.
            if (item.calc.group === 'past') continue;
            const key = item.countdown.category_id ?? null;
            const list = map.get(key) ?? [];
            list.push(item);
            map.set(key, list);
        }
        return [...map.entries()]
            .map(([categoryId, groupItems]) => {
                groupItems.sort((a, b) => a.calc.dueMs - b.calc.dueMs);
                return {
                    categoryId,
                    name: nameOf(nameFor, categoryId),
                    color: colorOf(colorFor, categoryId),
                    items: groupItems,
                    soonest: groupItems[0]!.calc.dueMs
                };
            })
            .sort((a, b) => a.soonest - b.soonest);
    }, [items, colorFor, nameFor]);

    const disabled = activeProfile != null && activeProfile.countdowns_enabled === false;

    const pastSection = {
        key: 'past',
        label: 'Past',
        color: groupColor('past'),
        rows: byGroup.get('past') ?? []
    };

    const sections = showArchived
        ? [
              {
                  key: 'archived',
                  label: 'Archived',
                  color: 'var(--color-text-faint)',
                  // Most recently archived first: here the archive date is what
                  // is being scanned, not the target date the API sorts by.
                  rows: [...items].sort((a, b) =>
                      (b.countdown.archived_date ?? '').localeCompare(
                          a.countdown.archived_date ?? ''
                      )
                  )
              }
          ]
        : groupMode === 'time'
          ? COUNTDOWN_GROUPS.map((g) => ({
                key: g.key,
                label: g.label,
                color: g.color,
                rows: byGroup.get(g.key) ?? []
            }))
          : [
                ...categorySections.map((s) => ({
                    key: `cat-${s.categoryId ?? 'none'}`,
                    label: s.name,
                    color: s.color ?? 'var(--color-text-faint)',
                    rows: s.items
                })),
                pastSection
            ];

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
        <PageShell
            isWide={isWide}
            showPane={showPane}
            paneWidth={400}
            pane={
                showPane && (
                    <DetailPane
                        key={editing?.id ?? 'new'}
                        innerClassName='w-[400px] rounded-card border p-4'
                        innerStyle={CARD_SURFACE_STYLE}
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
                    </DetailPane>
                )
            }
            overlay={
                // Narrow screens have no room for a side pane — use a modal.
                !isWide && (
                    <BaseModal
                        isOpen={paneOpen}
                        onClose={closePane}
                        title={paneTitle}
                        panelClassName='max-w-lg'
                    >
                        {formEl}
                    </BaseModal>
                )
            }
        >
            {/* flex-wrap: the grouping toggle + "New countdown" are shrink-0
                and together outgrow a phone-width row, so they drop to their
                own line instead of pushing the page sideways. */}
            <header className='mb-[24px] flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                        Countdown
                    </h1>
                    <div className='mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px]'>
                        <span className='text-text-muted'>
                            {total}
                            {showArchived ? ' archived' : ''}{' '}
                            {total === 1 ? 'countdown' : 'countdowns'}
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
                    // Wraps rather than overhanging: up to four controls (the
                    // time/category toggle, Archived, Manage groups, New
                    // countdown) share this row, more than a 375px phone
                    // column holds on one line.
                    <div className='flex flex-wrap items-center justify-end gap-2'>
                        {total > 0 && !showArchived && (
                            <span
                                className='flex items-center gap-0.5 rounded-chip border p-0.5'
                                style={{ borderColor: 'var(--surface-input-border)' }}
                            >
                                {(['time', 'category'] as const).map((mode) => {
                                    const selected = groupMode === mode;
                                    return (
                                        <Button
                                            key={mode}
                                            size='sm'
                                            variant='subtle'
                                            onClick={() => setGroupMode(mode)}
                                            aria-pressed={selected}
                                            className='rounded-chip font-mono uppercase tracking-[0.08em]'
                                            style={{
                                                borderRadius: 'var(--radius-chip)',
                                                backgroundColor: selected
                                                    ? 'rgba(255,255,255,.06)'
                                                    : 'transparent',
                                                color: selected
                                                    ? 'var(--color-now-accent)'
                                                    : 'var(--color-text-muted)'
                                            }}
                                        >
                                            {mode}
                                        </Button>
                                    );
                                })}
                            </span>
                        )}
                        {activeProfileId && (
                            <Button
                                size='md'
                                variant='icon'
                                onClick={() => setShowArchived((v) => !v)}
                                aria-pressed={showArchived}
                                aria-label={
                                    showArchived
                                        ? 'Show live countdowns'
                                        : 'Show archived countdowns'
                                }
                                className='font-mono'
                                style={inputStyle}
                            >
                                {showArchived ? <X size={15} /> : <Archive size={15} />}
                                <span>{showArchived ? 'Exit archived' : 'Archived'}</span>
                            </Button>
                        )}
                        {activeProfileId && !showArchived && (
                            <Button
                                size='md'
                                variant='icon'
                                onClick={() => setManagingCategories(true)}
                                aria-label='Manage countdown groups'
                                className='font-mono'
                                style={inputStyle}
                            >
                                <Tags size={15} />
                                <span>Manage groups</span>
                            </Button>
                        )}
                        {activeProfileId && !showArchived && (
                            <Button
                                size='md'
                                variant='icon'
                                onClick={() => setCreating(true)}
                                aria-label='New countdown'
                                className='font-mono'
                                style={inputStyle}
                            >
                                <Plus size={15} />
                                <span>New countdown</span>
                            </Button>
                        )}
                    </div>
                )}
            </header>
            {activeProfileId && (
                <ManageCategoriesModal
                    isOpen={managingCategories}
                    onClose={() => setManagingCategories(false)}
                    profileId={activeProfileId}
                />
            )}

            {disabled ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    Countdowns are turned off for this profile. Enable them in Settings.
                </p>
            ) : (
                <>
                    <QueryState
                        isError={countdownsQuery.isError}
                        isLoading={countdownsQuery.isLoading}
                        errorMessage='Failed to load countdowns.'
                        loadingMessage='Loading…'
                        size='md'
                    />
                    {!countdownsQuery.isError && !countdownsQuery.isLoading && total === 0 && (
                        <p className='font-mono text-[12px] text-text-faint'>
                            {showArchived
                                ? 'Nothing archived yet. Archive a countdown to retire it without deleting it.'
                                : 'No countdowns yet. Add one to track a deadline — with or without a task.'}
                        </p>
                    )}
                    {!countdownsQuery.isError && !countdownsQuery.isLoading && total > 0 && (
                        <div className='flex flex-col gap-[26px]'>
                            {sections.map((section) => {
                                if (section.rows.length === 0) return null;
                                // Past is collapsed by default: it only grows, and
                                // nothing in it needs acting on.
                                const collapsible = section.key === 'past';
                                const heading = (
                                    <>
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
                                    </>
                                );
                                return (
                                    <section key={section.key}>
                                        {collapsible ? (
                                            <Button
                                                size='sm'
                                                variant='subtle'
                                                onClick={() => setPastOpen((v) => !v)}
                                                aria-expanded={pastOpen}
                                                className='mb-2.5'
                                                style={{ padding: 0, gap: '0.5rem' }}
                                            >
                                                {heading}
                                                {pastOpen ? (
                                                    <ChevronDown size={13} />
                                                ) : (
                                                    <ChevronRight size={13} />
                                                )}
                                            </Button>
                                        ) : (
                                            <div className='mb-2.5 flex items-center gap-2'>
                                                {heading}
                                            </div>
                                        )}
                                        {(!collapsible || pastOpen) && (
                                            <div className={GRID_CLASS}>
                                                {section.rows.map(({ countdown, calc }) => (
                                                    <CountdownGridItem
                                                        key={countdown.id}
                                                        countdown={countdown}
                                                        calc={calc}
                                                        now={now}
                                                        onEdit={() => setEditing(countdown)}
                                                        categoryColor={colorOf(
                                                            colorFor,
                                                            countdown.category_id
                                                        )}
                                                        categoryName={
                                                            countdown.category_id != null
                                                                ? nameFor.get(countdown.category_id)
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </PageShell>
    );
};
