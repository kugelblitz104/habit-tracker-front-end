import { navTabLabel } from '@/components/layouts/app-header';
import { useLocation } from 'react-router';

type OriginState = { from?: string; editing?: boolean } | null;

export type DetailOrigin = {
    backTo: string;
    backLabel: string;
    /** Set only when the label is too terse to be an accessible name on its own. */
    ariaLabel: string | undefined;
};

/**
 * Resolve a stashed origin into the back link's target and wording.
 *
 * Only an in-app absolute path is followed. History state outlives a reload
 * and is editable, so an off-site URL there would be an open redirect.
 */
export const resolveDetailOrigin = (from: unknown, fallback: string): DetailOrigin => {
    const backTo =
        typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
            ? from
            : fallback;

    // A tab path names itself ("Journal"); anything deeper, like one project,
    // has no short name, so the link just says Back.
    const backLabel = navTabLabel(backTo.split('?')[0] ?? backTo) ?? 'Back';

    return {
        backTo,
        backLabel,
        // BackLink's default accessible name would be "Back to Back".
        ariaLabel: backLabel === 'Back' ? 'Back' : undefined
    };
};

/**
 * Where a full-page detail screen's back link goes.
 *
 * Every surface that opens a detail stashes the page it was on in
 * `location.state.from`, search string included, so the link returns to the
 * exact view rather than to a fixed parent. That is what lets the journal come
 * back to the day you were reading, and a countdown card come back to
 * Countdown instead of Today.
 *
 * `fallback` is the detail's own parent list, for a deep link or a refresh
 * that arrives with no origin.
 */
export const useDetailOrigin = (fallback: string): DetailOrigin & { editing: boolean } => {
    const state = useLocation().state as OriginState;
    return {
        ...resolveDetailOrigin(state?.from, fallback),
        editing: state?.editing ?? false
    };
};
