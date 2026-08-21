import type { CountdownRead } from '@/api';
import { BaseModal } from '@/components/ui/modals/base-modal';
import { Button } from '@/components/ui/buttons/button';
import { DetailPane } from '@/components/layouts/detail-pane';
import { PageShell } from '@/components/layouts/page-shell';
import { QueryState } from '@/components/ui/query-state';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { useCountdownCategories } from '@/features/countdowns/api/get-countdown-categories';
import { useCountdowns } from '@/features/countdowns/api/get-countdowns';
import {
    CountdownCaptureBar,
    type CountdownCaptureDraft
} from '@/features/countdowns/components/countdown-capture-bar';
import { CountdownCaptureForm } from '@/features/countdowns/components/countdown-capture-form';
import { CountdownForm } from '@/features/countdowns/components/countdown-form';
import { CountdownGridItem } from '@/features/countdowns/components/countdown-grid-item';
import { ManageCategoriesModal } from '@/features/countdowns/components/modals/manage-categories-modal';
import { compactFieldStyle } from '@/components/ui/forms/form-field-styles';
import {
    applyPastRule,
    COUNTDOWN_GROUPS,
    getCountdown,
    groupColor,
    type CountdownRepeat
} from '@/features/countdowns/utils/countdown';
import {
    buildCategoryColorMap,
    buildCategoryNameMap,
    colorOf,
    nameOf
} from '@/features/countdowns/utils/category-colors';
import { useAuth } from '@/lib/auth-context';
import { useNow } from '@/lib/use-now';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { Archive, ChevronDown, ChevronRight, Tags, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const inputStyle = compactFieldStyle;
const GRID_CLASS = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

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
    const [editing, setEditing] = useState<CountdownRead | null>(null);
    const [captureDraft, setCaptureDraft] = useState<CountdownCaptureDraft | null>(null);
    const [groupMode, setGroupMode] = useState<'time' | 'category'>('time');
    const [pastOpen, setPastOpen] = useState(false);
    const [managingCategories, setManagingCategories] = useState(false);
    const closePane = () => {
        setEditing(null);
    };

    const layout = useResponsiveLayout();
    const isWide = layout === 'lg' || layout === 'xl';
    const paneOpen = editing !== null;
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

    const paneTitle = 'Edit countdown';
    const formEl =
        activeProfileId && editing ? (
            <CountdownForm
                key={editing.id}
                profileId={activeProfileId}
                initial={editing}
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
                        key={editing?.id}
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
            {/* flex-wrap: the grouping toggle, Archived and Manage groups are
                shrink-0 and together outgrow a phone-width row, so they drop
                to their own line instead of pushing the page sideways. */}
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
                    // Wraps rather than overhanging: up to three controls (the
                    // time/category toggle, Archived, Manage groups) share
                    // this row, more than a 375px phone column holds on one
                    // line.
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
                    {captureDraft !== null && activeProfileId ? (
                        <CountdownCaptureForm
                            profileId={activeProfileId}
                            initial={captureDraft}
                            onClose={() => setCaptureDraft(null)}
                        />
                    ) : (
                        <CountdownCaptureBar
                            profileId={activeProfileId}
                            onExpand={setCaptureDraft}
                            disabled={!activeProfileId || showArchived}
                        />
                    )}
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
