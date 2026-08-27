import { Input } from '@/components/ui/forms/input';
import { isLinkableUrl } from '@/lib/external-link';
import { useState } from 'react';

type Props = {
    /** Drives the submit label only. The parent owns the mutation and the toast. */
    mode: 'create' | 'edit';
    initialRef: string;
    initialUrl: string;
    isPending: boolean;
    onCancel: () => void;
    /** Trimmed values, and only once the URL passes `isLinkableUrl`. */
    onSubmit: (values: { ref: string; url: string }) => void;
};

/**
 * The reference + URL pair behind "Link existing" and "Edit link". It owns its
 * own field state, so opening it pre-filled is a matter of what it is mounted
 * with rather than of syncing props into state - a refetch while the user is
 * typing therefore cannot clobber the draft.
 *
 * Both fields are required in both modes. The parent's `isLinked` is
 * `!!(external_ref && external_url)`, so saving a half-link renders the task as
 * unlinked and reads as the link having vanished rather than been edited.
 */
export const TaskLinkForm = ({
    mode,
    initialRef,
    initialUrl,
    isPending,
    onCancel,
    onSubmit
}: Props) => {
    const [ref, setRef] = useState(initialRef);
    const [url, setUrl] = useState(initialUrl);
    const [urlError, setUrlError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (!ref.trim() || !url.trim()) return;
        // The API rejects a scheme-less URL; catching it here keeps the message
        // on the field instead of surfacing a 422 as a toast.
        if (!isLinkableUrl(url)) {
            setUrlError('Enter a full URL starting with http:// or https://');
            return;
        }
        setUrlError(null);
        onSubmit({ ref: ref.trim(), url: url.trim() });
    };

    return (
        <div
            className='flex flex-col gap-2 rounded-[10px] border border-dashed p-3'
            style={{ borderColor: 'rgba(255,255,255,.12)' }}
        >
            <Input
                type='text'
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                aria-label='Reference'
                placeholder='Reference, e.g. AB#2841 or owner/repo#42'
                autoFocus
            />
            <Input
                type='text'
                value={url}
                onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlError(null);
                }}
                aria-label='Link URL'
                aria-invalid={urlError ? true : undefined}
                placeholder='https://… link to the work item / issue'
                style={{
                    borderColor: urlError ? 'var(--danger-border)' : 'var(--surface-input-border)'
                }}
            />
            {urlError && (
                <p className='font-mono text-[11px]' style={{ color: 'var(--color-danger)' }}>
                    {urlError}
                </p>
            )}
            <div className='flex items-center justify-end gap-1.5'>
                <button
                    type='button'
                    onClick={handleSubmit}
                    disabled={!ref.trim() || !url.trim() || isPending}
                    className='rounded-button border px-2.5 py-1 font-mono text-[11.5px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50'
                    style={{ borderColor: 'rgba(255,255,255,.14)' }}
                >
                    {mode === 'edit' ? 'Save link' : 'Link'}
                </button>
                <button
                    type='button'
                    onClick={onCancel}
                    disabled={isPending}
                    className='rounded-button border px-2.5 py-1 font-mono text-[11.5px] text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50'
                    style={{ borderColor: 'rgba(255,255,255,.12)' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
