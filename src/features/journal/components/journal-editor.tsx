import { Textarea } from '@/components/ui/forms/textarea';

type JournalEditorProps = {
    id: string;
    /** The question above the box. Also the `<label>`, so the box is never
     *  unnamed; callers substitute a default rather than passing nothing. */
    prompt: string;
    value: string;
    onChange: (value: string) => void;
    /** Commits the field. Fired on blur, and only when something changed. */
    onCommit: () => void;
    rows?: number;
    disabled?: boolean;
};

/**
 * A prompt and its prose box. The prompt is rendered as written, since it is
 * the user's own words (or one of the two defaults) and is the thing they are
 * answering.
 *
 * There is deliberately no placeholder. The heading is already the question,
 * and a second one inside the box asked something different and vanished on
 * the first keystroke.
 */
export const JournalEditor = ({
    id,
    prompt,
    value,
    onChange,
    onCommit,
    rows = 8,
    disabled
}: JournalEditorProps) => (
    <div className='min-w-0'>
        <label htmlFor={id} className='mb-2 block font-display text-[15px] text-text-secondary'>
            {prompt}
        </label>
        <Textarea
            id={id}
            tier='settings'
            rows={rows}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onCommit}
            disabled={disabled}
            className='resize-y leading-relaxed'
        />
    </div>
);
