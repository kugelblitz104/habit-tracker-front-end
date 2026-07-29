import type { ReactNode } from 'react';
import { CARD_SURFACE_CLASS, CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';

/** Private to this module — the four insights charts each redeclared this identically. */
const titleClass =
    'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted';

type ChartCardProps = {
    /** Chart heading, e.g. "Time tracked". */
    title: string;
    /** Right-aligned mono figure in the header row, e.g. "1h 25m" or "12 total". */
    meta: ReactNode;
    /** When true, renders `emptyMessage` instead of `children`. */
    isEmpty: boolean;
    emptyMessage: string;
    children: ReactNode;
};

/**
 * Shared scaffold for the four insights charts: card surface → header row
 * (title + right-aligned figure) → empty-state message or the chart itself.
 */
export const ChartCard = ({ title, meta, isEmpty, emptyMessage, children }: ChartCardProps) => (
    <section className={CARD_SURFACE_CLASS} style={CARD_SURFACE_STYLE}>
        <div className='mb-3 flex items-baseline justify-between'>
            <h2 className={titleClass}>{title}</h2>
            <span className='font-mono text-[11px] text-text-faint'>{meta}</span>
        </div>
        {isEmpty ? (
            <p className='font-mono text-[12px] text-text-faint'>{emptyMessage}</p>
        ) : (
            children
        )}
    </section>
);
