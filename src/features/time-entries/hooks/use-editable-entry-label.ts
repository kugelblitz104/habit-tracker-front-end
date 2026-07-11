import { useEffect, useState } from 'react';
import { useUpdateTimeEntry } from '../api/update-time-entries';

type ActiveEntryLike = { id: number; label?: string | null } | null | undefined;

/**
 * Local draft for a running entry's label: resynced whenever the active entry
 * changes (new session, or a label update from elsewhere), committed to the
 * server on blur/Enter. Shared by the timer screen and the compact Today
 * indicator.
 */
export const useEditableEntryLabel = (active: ActiveEntryLike) => {
    const updateTimeEntry = useUpdateTimeEntry();
    const [draft, setDraft] = useState('');

    useEffect(() => {
        setDraft(active?.label ?? '');
    }, [active?.id, active?.label]);

    const commit = () => {
        if (!active) return;
        const next = draft.trim();
        if (next === (active.label ?? '')) return;
        updateTimeEntry.mutate({ entryId: active.id, data: { label: next || null } });
    };

    return { draft, setDraft, commit };
};
