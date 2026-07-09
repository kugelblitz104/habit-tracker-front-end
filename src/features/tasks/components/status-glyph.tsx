import { TaskStatus } from '@/types/types';
import { Circle, CircleDot, CircleHelp, CircleMinus, CircleX, type LucideIcon } from 'lucide-react';

type StatusGlyphProps = {
    status: TaskStatus;
    size: number;
    /** Accent color (CSS value). Ignored for `done`, which uses its own fill + check tokens. */
    color: string;
    strokeWidth?: number;
};

/** lucide glyphs that already draw the prototype's shape 1:1. */
const LUCIDE_GLYPH: Partial<Record<TaskStatus, LucideIcon>> = {
    [TaskStatus.OPEN]: Circle, // hollow ring
    [TaskStatus.SCHEDULED]: CircleDot, // ring + centre dot
    [TaskStatus.BLOCKED]: CircleMinus, // ring + horizontal bar
    [TaskStatus.NEEDS_INFO]: CircleHelp, // ring + "?"
    [TaskStatus.CANCELLED]: CircleX // ring + "✕"
};

/**
 * Per-status round glyph matching the design/prototype. lucide covers the
 * statuses it already renders faithfully; in progress / deferred / done use small
 * local SVGs so they read as a half-filled circle, a circle-with-» and a filled
 * circle-with-check. All glyphs share lucide's 24-unit viewBox + 2px stroke so
 * the footprint is identical wherever a status is shown.
 */
export const StatusGlyph = ({ status, size, color, strokeWidth = 2 }: StatusGlyphProps) => {
    const Lucide = LUCIDE_GLYPH[status];
    if (Lucide) {
        return <Lucide size={size} style={{ color }} strokeWidth={strokeWidth} />;
    }

    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true
    };

    if (status === TaskStatus.IN_PROGRESS) {
        // Circle with the LEFT half filled.
        return (
            <svg {...common} style={{ color }}>
                <circle cx='12' cy='12' r='9' />
                <path d='M12 3 A9 9 0 0 0 12 21 Z' fill='currentColor' stroke='none' />
            </svg>
        );
    }

    if (status === TaskStatus.DEFERRED) {
        // Circle with a » (two chevrons).
        return (
            <svg {...common} style={{ color }}>
                <circle cx='12' cy='12' r='9' />
                <path d='M8.5 9.5 11 12l-2.5 2.5' />
                <path d='M12.5 9.5 15 12l-2.5 2.5' />
            </svg>
        );
    }

    // DONE — filled circle (done green) with a light-green check.
    return (
        <svg {...common}>
            <circle cx='12' cy='12' r='9' fill='var(--color-status-done)' stroke='none' />
            <path d='M8.5 12.5 11 15l4.5-5' stroke='var(--color-status-done-check)' />
        </svg>
    );
};
