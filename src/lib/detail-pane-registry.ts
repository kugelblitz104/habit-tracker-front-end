// Tiny registry so the top nav can coordinate with any open master-detail pane
// across a route change: if a pane is open, the nav animates it closed first
// (so the layout collapses back to base width) and only then runs the page
// view-transition — otherwise the slide would morph/cross-fade from the wider
// pane-open layout. See AppHeader's handleNavClick.
type DetailPaneEntry = {
    /** Whether this pane is currently open. */
    isOpen: () => boolean;
    /** Close it (animates the layout back to base width). */
    close: () => void;
};

const entries = new Set<DetailPaneEntry>();

/** Register a pane; returns an unregister cleanup for useEffect. */
export const registerDetailPane = (entry: DetailPaneEntry): (() => void) => {
    entries.add(entry);
    return () => {
        entries.delete(entry);
    };
};

/** True if any registered detail pane is currently open. */
export const anyDetailPaneOpen = (): boolean => {
    for (const entry of entries) {
        if (entry.isOpen()) return true;
    }
    return false;
};

/** Close every open detail pane (no-op when none are open). */
export const closeAllDetailPanes = (): void => {
    entries.forEach((entry) => entry.close());
};
