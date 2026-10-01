import type { CountdownCreate } from '@/api';
import {
    matchByName,
    removeSegmentToken,
    TokenCheatsheetPopover,
    TokenPillRow,
    type TokenPill
} from '@/components/ui/forms/capture-tokens';
import { HighlightedInput } from '@/components/ui/forms/highlighted-input';
import { formatShortDate } from '@/features/tasks/utils/task-format';
import { parseLocalDate } from '@/lib/date-utils';
import { Plus } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useCreateCountdown } from '../api/create-countdowns';
import { useCountdownCategories } from '../api/get-countdown-categories';
import { parseCountdownInput, type CountdownTokenType } from '../utils/parse-countdown-input';

/** Accent per recognized quick-add token, painted by the highlight overlay. */
const COUNTDOWN_TOKEN_COLORS: Record<CountdownTokenType, string> = {
    date: 'var(--color-status-duetoday)',
    group: 'var(--color-status-needsinfo)'
};

/** The quick-add token reference shown in the capture bar's `?` popover. */
const TOKEN_CHEATSHEET: { token: string; label: string }[] = [
    { token: '>12-25', label: 'Target date' },
    { token: '@group', label: 'Group (@"two words" for spaces)' }
];

/**
 * Everything the expanded capture form needs to pre-fill its fields from a
 * one-line quick-add draft. `categoryId` is a matched group; `createGroupName`
 * is set instead when an `@name` token matched nothing, so the form can offer
 * an inline "create it" confirmation.
 */
export type CountdownCaptureDraft = {
    title: string;
    targetDate?: string;
    categoryId: number | null;
    createGroupName?: string;
};

type CountdownCaptureBarProps = {
    profileId: number | null | undefined;
    /** Open the expanded form carrying the parsed draft (Shift+Enter or the + button). */
    onExpand: (draft: CountdownCaptureDraft) => void;
    disabled?: boolean;
};

/**
 * Countdown quick-capture bar with inline token support (see
 * parse-countdown-input). Enter creates the countdown directly only when a
 * `>date` parsed and any typed `@group` matched an existing group, since a
 * countdown can't exist without a target date, and an unmatched group can't
 * be created silently. Anything short of that expands into the full form
 * with whatever was parsed carried over.
 */
export const CountdownCaptureBar = ({
    profileId,
    onExpand,
    disabled = false
}: CountdownCaptureBarProps) => {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const createCountdown = useCreateCountdown();
    const categoriesQuery = useCountdownCategories({ profileId });
    const categories = categoriesQuery.data?.categories ?? [];

    const parsed = useMemo(() => parseCountdownInput(value, new Date()), [value]);

    const matchGroup = (name: string): number | null => matchByName(categories, name);

    // Removable pills for the tokens parsed so far (date / group), so a
    // mistaken token is easy to spot and clear before Enter.
    const tokenPills = useMemo<TokenPill<CountdownTokenType>[]>(() => {
        const pills: TokenPill<CountdownTokenType>[] = [];
        if (parsed.targetDate)
            pills.push({
                type: 'date',
                label: formatShortDate(parseLocalDate(parsed.targetDate))
            });
        if (parsed.groupName) pills.push({ type: 'group', label: `@${parsed.groupName}` });
        return pills;
    }, [parsed]);

    const removeToken = (type: CountdownTokenType) => {
        const next = removeSegmentToken(parsed.segments, type);
        if (next === null) return;
        setValue(next);
        inputRef.current?.focus();
    };

    const buildDraft = (): CountdownCaptureDraft => {
        const draft: CountdownCaptureDraft = {
            title: parsed.cleanTitle,
            targetDate: parsed.targetDate,
            categoryId: null
        };
        if (parsed.groupName) {
            const matched = matchGroup(parsed.groupName);
            if (matched != null) draft.categoryId = matched;
            else draft.createGroupName = parsed.groupName;
        }
        return draft;
    };

    const isPending = createCountdown.isPending;
    const canAct = !!profileId && !disabled && !isPending;

    const expand = () => {
        if (!canAct) return;
        onExpand(buildDraft());
        setValue('');
    };

    const create = () => {
        if (!canAct || !profileId) return;
        const title = parsed.cleanTitle;
        if (!title) return;

        // No date means there is nothing to create, and an unmatched group can't be
        // created silently - both hand off to the expanded form.
        if (!parsed.targetDate) {
            expand();
            return;
        }
        if (parsed.groupName && matchGroup(parsed.groupName) == null) {
            expand();
            return;
        }

        const data: CountdownCreate = {
            profile_id: profileId,
            title,
            target_date: parsed.targetDate
        };
        const categoryId = parsed.groupName ? matchGroup(parsed.groupName) : null;
        if (categoryId != null) data.category_id = categoryId;

        createCountdown.mutate(data, {
            onSuccess: () => {
                toast.success('Countdown created');
                setValue('');
            },
            onError: () => toast.error('Failed to add countdown. Please try again.')
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (e.shiftKey) expand();
        else create();
    };

    return (
        <div className='mb-[30px]'>
            <div
                className='flex items-center gap-2 rounded-button border px-3 py-2.5'
                style={{
                    backgroundColor: 'var(--surface-input-bg)',
                    borderColor: 'var(--surface-input-border)',
                    opacity: disabled ? 0.5 : 1
                }}
            >
                <button
                    type='button'
                    onClick={expand}
                    disabled={!canAct}
                    aria-label='Add details'
                    title='Add details'
                    className='inline-flex min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full p-0.5 text-text-muted transition-colors pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] hover:text-text-primary disabled:cursor-not-allowed'
                >
                    <Plus size={18} />
                </button>
                <HighlightedInput
                    value={value}
                    segments={parsed.segments}
                    tokenColors={COUNTDOWN_TOKEN_COLORS}
                    onChange={setValue}
                    onKeyDown={handleKeyDown}
                    placeholder='Add a countdown...'
                    disabled={disabled || isPending}
                    ariaLabel='Add a countdown'
                    inputRef={inputRef}
                />
                <span className='hidden shrink-0 items-center gap-2 font-mono text-[10px] text-text-faint sm:flex'>
                    <span>↵ add</span>
                    <span>⇧↵ details</span>
                </span>
                <TokenCheatsheetPopover rows={TOKEN_CHEATSHEET} />
            </div>
            <TokenPillRow pills={tokenPills} onRemove={removeToken} />
        </div>
    );
};
