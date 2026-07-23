import { useEffect, useState } from 'react';

/**
 * Tracks the OS `prefers-reduced-motion` setting. Starts `false` so it matches
 * the SSR render (no `window`), then resolves on mount and updates live if the
 * user toggles the setting. Used to disable chart entrance animations, mirroring
 * the inline check in `task-card.tsx`.
 */
export const usePrefersReducedMotion = (): boolean => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return reduced;
};
