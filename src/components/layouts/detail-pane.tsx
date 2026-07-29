import type { CSSProperties, ReactNode } from 'react';
import { PANE_INNER_WIDTH } from '@/lib/layout';

type DetailPaneProps = {
    /** Fixed inner width. Ignored when `innerClassName` is given. Defaults to 480. */
    width?: 400 | 480;
    /** Override the whole inner div's class — lets a caller fuse the width and its
     * own card surface into one node instead of nesting a separate card inside. */
    innerClassName?: string;
    innerStyle?: CSSProperties;
    children: ReactNode;
};

/**
 * Sticky master-detail pane host shared by the task, habit and countdown
 * panes. Fills (and clips) the grid pane track that animates 0 -> `width`px
 * while opening; the fixed-width inner keeps the content laid out at its
 * final width throughout. `pane-rise` floats it up into place — it lives on
 * the scroll container itself (not the inner) so the transform doesn't
 * inflate scrollHeight and flash a scrollbar mid-rise.
 *
 * Does NOT own the card surface: each caller renders its own inner card
 * (different background/border tokens, different padding while editing),
 * because the task and habit panes are deliberately different surfaces. Pass
 * `innerClassName`/`innerStyle` when a caller (the countdown pane) wants the
 * width and card fused into a single node instead.
 *
 * Callers should `key` the `DetailPane` element itself by whatever id
 * identifies the open item (task id, habit id, countdown id) so switching
 * targets remounts it and replays the rise. This component holds no state of
 * its own, so that's equivalent to keying the old `<aside>` directly — any
 * editing state that must survive an id change lives in the caller instead.
 */
export const DetailPane = ({
    width = 480,
    innerClassName,
    innerStyle,
    children
}: DetailPaneProps) => {
    return (
        <aside className='pane-rise sticky top-7 max-h-[calc(100vh-3.5rem)] w-full min-w-0 overflow-x-hidden overflow-y-auto'>
            <div className={innerClassName ?? PANE_INNER_WIDTH[width]} style={innerStyle}>
                {children}
            </div>
        </aside>
    );
};
