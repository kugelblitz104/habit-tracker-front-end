import { QueryState } from '@/components/ui/query-state';
import type { ReactNode } from 'react';

type DaySectionProps = {
    title: string;
    /** Beside the title: a count, "2/4", a duration total. Hidden when null. */
    meta?: string | null;
    isLoading: boolean;
    isError: boolean;
    /** The previous day's rows are still on screen while this day loads. */
    isBusy?: boolean;
    errorMessage: string;
    emptyMessage: string;
    isEmpty: boolean;
    /** The rows, rendered inside the list only when there are any. */
    children: ReactNode;
};

/**
 * One band of the journal day: a heading, a figure, and a list of rows.
 *
 * Five sections share this rather than each repeating the heading, the query
 * states and the empty line, so a day that loaded nothing reads the same
 * whichever entity it belongs to.
 */
export const DaySection = ({
    title,
    meta,
    isLoading,
    isError,
    isBusy = false,
    errorMessage,
    emptyMessage,
    isEmpty,
    children
}: DaySectionProps) => (
    <section aria-busy={isBusy}>
        <div className='mb-2.5 flex items-center gap-2'>
            <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                {title}
            </h2>
            {meta && <span className='font-mono text-[11px] text-text-faint'>{meta}</span>}
        </div>

        <QueryState
            isError={isError}
            isLoading={isLoading}
            errorMessage={errorMessage}
            loadingMessage='Loading…'
            size='sm'
        />

        {!isError && !isLoading && isEmpty && (
            <p className='font-mono text-[11px] text-text-faint'>{emptyMessage}</p>
        )}

        {!isEmpty && <ul className='flex flex-col'>{children}</ul>}
    </section>
);

type DayRowProps = {
    /** Leading dot, when the row has a colour worth carrying. */
    dotColor?: string;
    title: string;
    /** Makes the title a button; leave unset for a row that does not open. */
    onClick?: () => void;
    /** Pressed state for the row whose detail is open in the pane. */
    selected?: boolean;
    struck?: boolean;
    /** Right-hand side: a time, a duration, a glyph. */
    trailing?: ReactNode;
};

const titleClass =
    'flex min-h-[24px] min-w-0 flex-1 items-center py-1 text-left font-display text-[13.5px] text-text-muted pointer-coarse:min-h-[44px]';

export const DayRow = ({ dotColor, title, onClick, selected, struck, trailing }: DayRowProps) => (
    <li
        className='flex items-center gap-2.5 border-b py-2'
        style={{ borderColor: 'var(--color-whenever-ring)' }}
    >
        {dotColor && (
            <span
                aria-hidden='true'
                className='h-1.5 w-1.5 shrink-0 rounded-full'
                style={{ backgroundColor: dotColor }}
            />
        )}
        {/* Inner span throughout, because `truncate` needs a block box while
            the title itself is a flex row carrying the target floor. */}
        {onClick ? (
            <button
                type='button'
                onClick={onClick}
                aria-pressed={selected}
                className={`${titleClass} transition-colors hover:text-text-primary ${
                    struck ? 'line-through' : ''
                }`}
                title={title}
            >
                <span className='truncate'>{title}</span>
            </button>
        ) : (
            <span className={`${titleClass} ${struck ? 'line-through' : ''}`} title={title}>
                <span className='truncate'>{title}</span>
            </span>
        )}
        {trailing && (
            <div className='shrink-0 font-mono text-[10px] text-text-faint'>{trailing}</div>
        )}
    </li>
);
