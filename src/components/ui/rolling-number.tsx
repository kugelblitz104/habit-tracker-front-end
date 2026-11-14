import { useState } from 'react';

let lastInputAt = -Infinity;
if (typeof window !== 'undefined') {
    for (const type of ['pointerdown', 'keydown']) {
        window.addEventListener(type, () => (lastInputAt = performance.now()), {
            capture: true,
            passive: true
        });
    }
}

/**
 * Tracks a number across renders. `n` increments only when `value` changes while
 * `isLive()` holds (default: within 600ms of a pointer or key press that came
 * after this component mounted, so the click that navigated here does not
 * count). Initial load, refetches and background updates never read as a change.
 * `dir` is the direction of the last live change. Use `n` as a React key to
 * replay an animation.
 */
export const useValueChange = (value: number, isLive?: () => boolean) => {
    const [mountedAt] = useState(() => performance.now());
    const [state, setState] = useState({ value, n: 0, dir: 0 });
    if (state.value !== value) {
        const now = performance.now();
        const live = isLive ? isLive() : lastInputAt > mountedAt && now - lastInputAt < 600;
        setState(
            live
                ? { value, n: state.n + 1, dir: value > state.value ? 1 : -1 }
                : { ...state, value }
        );
    }
    return state;
};

/** A number that rolls in when it changes in response to user input. */
export const RollingNumber = ({ value, className = '' }: { value: number; className?: string }) => {
    const { n } = useValueChange(value);
    return (
        <span
            key={n}
            className={`inline-block ${n > 0 ? 'motion-safe:animate-roll' : ''} ${className}`}
        >
            {value}
        </span>
    );
};
