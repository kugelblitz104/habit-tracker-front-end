import type { CSSProperties, ReactNode } from 'react';
import { Plus, TriangleAlert } from 'lucide-react';
import { InlineConfirmAction } from '@/components/ui/inline-confirm-action';

/**
 * Shared byte-identical pieces of the calendar and integration connection
 * rows (`connections-card.tsx` / `integration-connections-section.tsx`).
 * The two lists are NOT unified into one component — calendar rows carry an
 * `EmberToggle`, integration rows a "Sync now" button, a provider subline and
 * a PAT note, and forcing that into one component would need ~12 props. Only
 * the parts with no per-list variation live here.
 */

export const CONNECTION_ROW_CLASS =
    'flex items-center gap-3 rounded-[10px] border px-3.5 py-[11px]';

export const CONNECTION_ROW_STYLE: CSSProperties = {
    backgroundColor: 'rgba(255,255,255,.02)',
    borderColor: 'rgba(255,255,255,.07)'
};

/** The 9x9 colour pip's shared shape. Radius is normalised to `rounded-[3px]`
 * for both lists (integrations used `rounded-[2px]` before — a deliberate 1px
 * visual change). Background colour is per-row, so it stays a caller prop. */
export const CONNECTION_PIP_CLASS = 'h-[9px] w-[9px] flex-none rounded-[3px]';

type ConnectionListStateProps = {
    isLoading?: boolean;
    isError?: boolean;
    loadingMessage: string;
    errorMessage: string;
};

/**
 * The loading/error line above a connection list. Deliberately `<div>`, not
 * `<p>`, and the copy carries no trailing full stop (`Failed to load
 * calendars`) — that's why these don't use the shared `QueryState`.
 * `e2e/flows/query-states.spec.ts` pins the exact strings, so preserve
 * `loadingMessage`/`errorMessage` verbatim at each call site.
 */
export const ConnectionListState = ({
    isLoading,
    isError,
    loadingMessage,
    errorMessage
}: ConnectionListStateProps) => (
    <>
        {isLoading && (
            <div className='py-1 font-mono text-[11px] text-text-faint'>{loadingMessage}</div>
        )}
        {isError && <div className='py-1 font-mono text-[11px] text-danger'>{errorMessage}</div>}
    </>
);

/** A row's `last_error` warning line, with its `TriangleAlert` glyph. */
export const ConnectionLastError = ({ message }: { message: string | null | undefined }) => {
    if (!message) return null;
    return (
        <div className='mt-1 flex items-center gap-1 font-mono text-[11px] text-danger'>
            <TriangleAlert size={11} className='flex-none' />
            <span className='truncate'>{message}</span>
        </div>
    );
};

type ConnectionRowActionsProps = {
    isConfirming: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    pending: boolean;
    children: ReactNode;
};

/** The identical `InlineConfirmAction` preset both row lists use for Remove. */
export const ConnectionRowActions = ({
    isConfirming,
    onConfirm,
    onCancel,
    pending,
    children
}: ConnectionRowActionsProps) => (
    <InlineConfirmAction
        isConfirming={isConfirming}
        onConfirm={onConfirm}
        onCancel={onCancel}
        pending={pending}
        confirmPrompt='Remove?'
        confirmButtonClassName='py-1'
        triggerClassName='flex items-center gap-1'
    >
        {children}
    </InlineConfirmAction>
);

/** The dashed "+ Connect a …" trigger shown when no create form is open. */
export const AddConnectionButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
        type='button'
        onClick={onClick}
        className='flex min-h-[36px] items-center justify-center gap-2 rounded-[10px] border border-dashed p-2.5 text-[12.5px] text-text-muted transition-colors pointer-coarse:min-h-[44px] hover:text-text-secondary'
        style={{ borderColor: 'rgba(255,255,255,.12)' }}
    >
        <Plus size={14} />
        {label}
    </button>
);

/** The `· for <profile>` subtitle line under a connections card's heading. */
export const ConnectionsSubtitle = ({
    profileName,
    children
}: {
    profileName: string;
    children: ReactNode;
}) => (
    <div className='mb-2.5 text-[12px]' style={{ color: '#9a8f81' }}>
        {children} · for{' '}
        <span className='font-semibold text-text-secondary-soft'>{profileName}</span>
    </div>
);
