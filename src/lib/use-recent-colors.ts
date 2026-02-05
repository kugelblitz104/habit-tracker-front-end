import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'recent-colors';
const MAX_COLORS = 6;

type Listener = () => void;
const listeners = new Set<Listener>();

// Cache the snapshot to prevent infinite re-renders
let cachedColors: string[] = [];
let cachedJson: string = '';

const notifyListeners = () => {
    listeners.forEach((listener) => listener());
};

const getRecentColors = (): string[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getSnapshot = (): string[] => {
    const stored = localStorage.getItem(STORAGE_KEY) || '[]';
    // Only create new array if data actually changed
    if (stored !== cachedJson) {
        cachedJson = stored;
        try {
            cachedColors = JSON.parse(stored);
        } catch {
            cachedColors = [];
        }
    }
    return cachedColors;
};

export const useRecentColors = () => {
    const recentColors = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const addRecentColor = useCallback((color: string) => {
        const normalized = color.toLowerCase();
        const current = getRecentColors();

        // Remove if already exists (will be added to front)
        const filtered = current.filter((c) => c.toLowerCase() !== normalized);

        // Add to front and limit to MAX_COLORS
        const updated = [normalized, ...filtered].slice(0, MAX_COLORS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        notifyListeners();
    }, []);

    return { recentColors, addRecentColor };
};
