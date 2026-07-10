import { formFieldClass, formFieldStyle } from '@/features/tasks/components/task-form-fields';
import { useId, useMemo } from 'react';
import { useTimeEntries } from '../api/get-time-entries';

type LabelInputProps = {
    profileId: number | null | undefined;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    /** Called on Enter (e.g. to start the timer / commit the label). */
    onEnter?: () => void;
    /** Called on blur (e.g. to commit an edited label). */
    onBlur?: () => void;
};

/**
 * Free-text label input with autofill suggestions drawn from the profile's
 * recent time-entry labels (distinct, most-recent-first). Uses a native
 * <datalist> so typing filters the suggestions.
 */
export const LabelInput = ({
    profileId,
    value,
    onChange,
    disabled,
    placeholder = 'Label (optional)',
    onEnter,
    onBlur
}: LabelInputProps) => {
    const listId = useId();
    const entriesQuery = useTimeEntries({ profileId, limit: 100 });

    const suggestions = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const entry of entriesQuery.data?.time_entries ?? []) {
            const label = entry.label?.trim();
            if (label && !seen.has(label.toLowerCase())) {
                seen.add(label.toLowerCase());
                out.push(label);
            }
            if (out.length >= 20) break;
        }
        return out;
    }, [entriesQuery.data]);

    return (
        <>
            <input
                type='text'
                list={listId}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onEnter?.();
                    }
                }}
                placeholder={placeholder}
                aria-label='Time entry label'
                className={`${formFieldClass} placeholder:text-text-faint disabled:opacity-60`}
                style={formFieldStyle}
            />
            <datalist id={listId}>
                {suggestions.map((label) => (
                    <option key={label} value={label} />
                ))}
            </datalist>
        </>
    );
};
