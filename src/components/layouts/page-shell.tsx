import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layouts/app-header';
import {
    PAGE_MAX_WIDTH,
    PAGE_MAX_WIDTH_PANE,
    PAGE_WIDTH_TRANSITION,
    paneRowClass
} from '@/lib/layout';

type PageShellProps = {
    isWide: boolean;
    showPane: boolean;
    /** The pane row's second grid track width. Defaults to 480 (task/habit panes). */
    paneWidth?: 400 | 480;
    /** Main content column (`min-w-0 flex-1`). */
    children: ReactNode;
    /** The detail pane(s) beside the content, inside the same pane row. */
    pane?: ReactNode;
    /** Rendered inside the centred container, after the pane row (e.g. a modal
     * that still wants the container's width context). */
    afterRow?: ReactNode;
    /** Rendered outside the centred container, as a sibling inside the
     * `min-h-screen` wrapper (e.g. a bulk-action bar or a narrow-screen modal). */
    overlay?: ReactNode;
};

/**
 * Shared page scaffold for the five master-detail surfaces (Today, All tasks,
 * Habits dashboard, Countdown, the Project route): a transparent `min-h-screen`
 * wrapper, `AppHeader` at the current max width, a centred container that
 * animates as the pane opens, the two-track pane row, and the `min-w-0 flex-1`
 * content column.
 *
 * `insights-page.tsx` and `projects-page.tsx` look similar but stay
 * OUT of this component deliberately: they have no `PAGE_WIDTH_TRANSITION` and
 * no pane row / `min-w-0 flex-1` wrappers, so folding them in would add DOM
 * nodes they don't have or a `transition-[max-width]` they don't animate on
 * resize — a visual change. Do not "fix" that by widening this component's
 * remit; give them their own scaffold instead.
 */
export const PageShell = ({
    isWide,
    showPane,
    paneWidth = 480,
    children,
    pane,
    afterRow,
    overlay
}: PageShellProps) => {
    const maxWidthClass = showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={maxWidthClass} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_WIDTH_TRANSITION} ${maxWidthClass}`}>
                <div className={paneRowClass(isWide, showPane, paneWidth)}>
                    <div className='min-w-0 flex-1'>{children}</div>

                    {pane}
                </div>

                {afterRow}
            </div>

            {overlay}
        </div>
    );
};
