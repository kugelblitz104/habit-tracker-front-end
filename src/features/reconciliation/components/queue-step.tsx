import { Button } from '@/components/ui/buttons/button';
import { QueryState } from '@/components/ui/query-state';
import type { ReactNode } from 'react';

export type QueueRow = {
    id: number;
    title: string;
    /** The evidence for why this row is here: "untouched 94 days", "12 open ·
     *  nothing closed in 7 months". Shown beside the title so the decision is
     *  informed rather than taken on trust. */
    meta: string;
};

type QueueStepProps = {
    title: string;
    /** One line stating what this queue is asking of you. */
    hint: string;
    rows: QueueRow[];
    selectedIds: Set<number>;
    onToggle: (id: number) => void;
    onSelectAll: () => void;
    /** The queue's verbs. Rendered only when something is selected, so the
     *  buttons never invite a click that would apply to nothing. */
    actions: ReactNode;
    isLoading: boolean;
    isError: boolean;
};

const ROW_BORDER = { borderColor: 'var(--color-whenever-ring)' };

/**
 * One step of the reconciliation: a queue's rows, a checkbox each, and that
 * queue's verbs.
 *
 * Generic over all four queues - they differ in their data and their verbs, not
 * their layout - so a new queue supplies `rows` and an `actions` slot rather
 * than a new component.
 *
 * Not built on the journal's `DayRow`: that makes the *title* the button and
 * has no checkbox slot, which fights selection.
 */
export const QueueStep = ({
    title,
    hint,
    rows,
    selectedIds,
    onToggle,
    onSelectAll,
    actions,
    isLoading,
    isError
}: QueueStepProps) => {
    const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

    return (
        <section>
            <div className='mb-1 flex items-center gap-2'>
                <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                    {title}
                </h2>
                <span className='font-mono text-[11px] text-text-faint'>{rows.length}</span>
            </div>
            <p className='mb-3 font-display text-[12.5px] text-text-faint'>{hint}</p>

            <QueryState
                isError={isError}
                isLoading={isLoading}
                errorMessage='Could not load this queue.'
                loadingMessage='Loading…'
                size='sm'
            />

            {!isError && !isLoading && rows.length === 0 && (
                <p className='font-mono text-[11px] text-text-faint'>
                    Nothing here. This queue is clear.
                </p>
            )}

            {rows.length > 0 && (
                <>
                    <ul className='flex flex-col'>
                        {rows.map((row) => (
                            <li
                                key={row.id}
                                className='flex items-center gap-2.5 border-b py-2'
                                style={ROW_BORDER}
                            >
                                {/* 24px on every pointer, no coarse bump: rows sit
                                    ~40px apart, so 44px targets would collide with
                                    the row above. 24px is SC 2.5.8's normative AA
                                    minimum; the enhanced target is waived under the
                                    inline exception, as for the meta chips and the
                                    capture-bar pills. */}
                                <input
                                    type='checkbox'
                                    className='h-6 w-6 shrink-0'
                                    data-target-exempt='inline'
                                    checked={selectedIds.has(row.id)}
                                    onChange={() => onToggle(row.id)}
                                    aria-label={`Select ${row.title}`}
                                />
                                <div className='min-w-0 flex-1'>
                                    <p
                                        className='truncate font-display text-[13.5px] text-text-muted'
                                        title={row.title}
                                    >
                                        {row.title}
                                    </p>
                                    <p className='font-mono text-[10.5px] text-text-faint'>
                                        {row.meta}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className='mt-3 flex flex-wrap items-center gap-2'>
                        <Button size='sm' variant='subtle' onClick={onSelectAll}>
                            {allSelected ? 'Deselect all' : `Select all ${rows.length}`}
                        </Button>
                        {selectedIds.size > 0 && (
                            <>
                                <span className='font-mono text-[11px] text-text-faint'>
                                    {selectedIds.size} selected
                                </span>
                                {actions}
                            </>
                        )}
                    </div>
                </>
            )}
        </section>
    );
};
