// Shared page-width scheme for the primary surfaces (Today / Habits / Projects
// and their detail pages). Using the SAME values everywhere means switching
// between pages via the top nav never shifts the layout width.
//
// Use PAGE_MAX_WIDTH for the normal content column, and PAGE_MAX_WIDTH_PANE
// when a detail pane (task/habit) is open beside the content.
export const PAGE_MAX_WIDTH = 'max-w-[1080px]';
export const PAGE_MAX_WIDTH_PANE = 'max-w-[1440px]';

// Animate the centered container as it widens/narrows for the detail pane, so
// the page content glides left/right instead of snapping. Applied to the
// content container AND the header so the whole page moves as one piece.
export const PAGE_WIDTH_TRANSITION = 'transition-[max-width] duration-300 ease-out';

// Literal grid-column templates — kept whole so Tailwind's source scanner can
// see (and emit) each arbitrary value. The pane track grows from 0 to its width
// in step with the container widening, which is what makes the main column
// reflow smoothly rather than squish-then-settle.
const PANE_OPEN_COLS: Record<number, string> = {
    480: 'grid-cols-[minmax(0,1fr)_480px]',
    400: 'grid-cols-[minmax(0,1fr)_400px]'
};
const PANE_CLOSED_COLS = 'grid-cols-[minmax(0,1fr)_0px]';

/**
 * Classes for the master-detail row. On wide screens it's a two-track grid whose
 * second (pane) track animates between 0 and `paneWidth`, so opening/closing the
 * detail pane reflows the main column smoothly. Narrow screens stay in normal
 * block flow (the pane isn't rendered there, so the row needs no columns).
 */
export const paneRowClass = (
    isWide: boolean,
    showPane: boolean,
    paneWidth: 400 | 480 = 480
): string => {
    if (!isWide) return '';
    const cols = showPane ? PANE_OPEN_COLS[paneWidth] : PANE_CLOSED_COLS;
    const gap = showPane ? 'gap-x-6' : 'gap-x-0';
    return `grid items-start transition-all duration-300 ease-out ${gap} ${cols}`;
};
