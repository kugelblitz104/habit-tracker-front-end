import { useEffect, useState } from 'react';

type Kind = 'task' | 'countdown';

/** When each id was created through a capture control, keyed `kind:id`. */
const createdAt = new Map<string, number>();

/** A create whose row has not mounted within this window no longer animates. */
const FRESH_MS = 4000;

/** Record an id the user just created, from the create mutation's onSuccess. */
export const markJustCreated = (kind: Kind, id: number) => {
    createdAt.set(`${kind}:${id}`, performance.now());
};

/**
 * Whether this row is the first render of an id passed to `markJustCreated`,
 * so rows arriving from a refetch, a profile switch or paging never animate.
 * The second value clears the flag, for rows whose entry classes must not
 * outlive the animation.
 */
export const useJustCreated = (kind: Kind, id: number) => {
    const key = `${kind}:${id}`;
    // Read in the initializer and deleted in the effect, so StrictMode's double
    // initializer call sees the same answer.
    const [fresh, setFresh] = useState(() => {
        const at = createdAt.get(key);
        return at != null && performance.now() - at < FRESH_MS;
    });
    useEffect(() => {
        createdAt.delete(key);
    }, [key]);
    return [fresh, () => setFresh(false)] as const;
};
