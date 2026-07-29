import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Open a detail pane when arriving from global search: wide screens route
 * here with an id in router state under `stateKey`, narrow goes straight to
 * the full-page detail route instead. Keyed on `location.key` so repeat
 * searches re-trigger even when already on this page.
 */
export const useOpenFromSearchState = (stateKey: string, open: (id: number) => void) => {
    const location = useLocation();
    useEffect(() => {
        const id = (location.state as Record<string, number | undefined> | null)?.[stateKey];
        if (id != null) open(id);
        // `open` is stable for a given viewport; re-run only on navigation.
        // location.state and `open` are intentionally left out of the deps.
    }, [location.key]);
};
