import { useEffect, useRef } from 'react';

/**
 * Persist and restore the window scroll position for a surface, keyed in
 * localStorage (same persistence pattern as `use-task-controls`). Restores
 * only once `ready` flips true — i.e. the content that determines page height
 * has loaded — so the saved offset isn't clamped against a short, still-loading
 * page. Coming back to the view lands you where you left off.
 */
export const useScrollRestoration = (key: string, ready: boolean) => {
    const restored = useRef(false);

    useEffect(() => {
        if (restored.current || !ready) return;
        restored.current = true;
        try {
            const saved = Number(localStorage.getItem(key));
            if (Number.isFinite(saved) && saved > 0) {
                // Wait a frame so the loaded content has painted its full height.
                requestAnimationFrame(() => window.scrollTo(0, saved));
            }
        } catch {
            /* ignore read failures */
        }
    }, [key, ready]);

    useEffect(() => {
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                try {
                    localStorage.setItem(key, String(window.scrollY));
                } catch {
                    /* ignore persistence failures */
                }
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [key]);
};
