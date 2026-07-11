import { useCallback, useState } from 'react';

export type NoteDialogOpenParams<TTarget> = {
    date: Date;
    trackerId: number | null;
    /** Caller-defined extra context for the note being edited (e.g. the habit id
     *  on the dashboard grid, where the same dialog serves every row). Omit when
     *  the dialog only ever edits one fixed target (e.g. the detail calendar). */
    target?: TTarget;
};

type NoteDialogState<TTarget> = {
    isOpen: boolean;
    date: Date | null;
    trackerId: number | null;
    target: TTarget | null;
};

export type UseNoteDialogResult<TTarget> = NoteDialogState<TTarget> & {
    open: (params: NoteDialogOpenParams<TTarget>) => void;
    close: () => void;
};

/**
 * Shared open/target/value state for a note-edit dialog: which date and
 * tracker (if any) the note applies to, plus an optional caller-defined
 * `target`. Extracted from the near-identical local state carried by both
 * `habit-list.tsx` (target = habitId) and `calendar-board.tsx` (no target —
 * the habit is already fixed via props).
 */
export const useNoteDialog = <TTarget = undefined>(): UseNoteDialogResult<TTarget> => {
    const [state, setState] = useState<NoteDialogState<TTarget>>(() => ({
        isOpen: false,
        date: null,
        trackerId: null,
        target: null
    }));

    const open = useCallback((params: NoteDialogOpenParams<TTarget>) => {
        setState({
            isOpen: true,
            date: params.date,
            trackerId: params.trackerId,
            target: (params.target ?? null) as TTarget | null
        });
    }, []);

    const close = useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return { ...state, open, close };
};
