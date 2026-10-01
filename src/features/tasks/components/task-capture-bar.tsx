import { TaskStatus } from '@/types/types';
import type { ProjectRead, TaskCreate } from '@/api';
import {
    matchByName,
    removeSegmentToken,
    TokenCheatsheetPopover,
    TokenPillRow,
    type TokenPill
} from '@/components/ui/forms/capture-tokens';
import { formatShortDate } from '../utils/task-format';
import { parseLocalDate } from '@/lib/date-utils';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useProjects } from '@/features/projects/api/get-projects';
import { useCreateTask } from '../api/create-tasks';
import { parseTaskInput, type TaskTokenType } from '../utils/parse-task-input';
import { PRIORITY_LABELS } from '../utils/priority-config';
import { HighlightedInput } from '@/components/ui/forms/highlighted-input';
import { TASK_TOKEN_COLORS } from './task-token-colors';
import { ProjectAutocomplete } from './project-autocomplete';

/** The quick-add token reference shown in the capture bar's `?` popover. */
const TOKEN_CHEATSHEET: { token: string; label: string }[] = [
    { token: '!high', label: 'Priority — low / med / high / none' },
    { token: '*fri', label: 'Scheduled date' },
    { token: '>8-16', label: 'Due date' },
    { token: '@project', label: 'Project (@"two words" for spaces)' },
    { token: '~30', label: 'Estimate in minutes' },
    { token: '-notes', label: 'Notes (runs to end of line)' }
];

/** The `@`-token the caret is currently positioned inside, if any. */
type ActiveAtToken = {
    /** Index of the leading `@`. */
    start: number;
    /** Always the caret position — the span only ever runs up to the caret. */
    end: number;
    /** Text after `@` (and after the opening quote, for `@"…`/`@'…`) up to the caret. */
    query: string;
};

/**
 * Finds the `@`-token the caret is currently "inside", for live autocomplete.
 * parseTaskInput only sees *committed* tokens once parsing runs, so this is
 * caret-relative detection: the nearest `@` to the left of the caret that
 * starts a token (preceded by start-of-string or whitespace) with no
 * whitespace between it and the caret — or, for the quoted form, an `@"…`/
 * `@'…` span that hasn't been closed with a matching quote yet. Returns null
 * when the caret isn't inside such a token.
 */
const findActiveAtToken = (value: string, caret: number): ActiveAtToken | null => {
    const pos = Math.max(0, Math.min(caret, value.length));
    const uptoCaret = value.slice(0, pos);

    const plain = /(?:^|\s)@([^\s]*)$/.exec(uptoCaret);
    if (plain) {
        const query = plain[1]!;
        if (query[0] !== '"' && query[0] !== "'") {
            return { start: pos - query.length - 1, end: pos, query };
        }
    }

    // Quoted form: @"… or @'… with no closing quote yet between '@' and the caret.
    const quoted = /(?:^|\s)@(["'])((?:(?!\1).)*)$/.exec(uptoCaret);
    if (quoted) {
        const start = pos - quoted[0].length + (quoted[0].startsWith('@') ? 0 : 1);
        return { start, end: pos, query: quoted[2]! };
    }

    return null;
};

/**
 * Everything the expanded capture form needs to pre-fill its fields from a
 * one-line quick-add draft. `projectId` is a matched project; `createProjectName`
 * is set instead when an `@name` token matched nothing, so the form can offer an
 * inline "create it" confirmation.
 */
export type TaskCaptureDraft = {
    title: string;
    priority?: number;
    scheduledDate?: string;
    dueDate?: string;
    estimatedMinutes?: number;
    notes?: string;
    projectId: number | null;
    createProjectName?: string;
};

type TaskCaptureBarProps = {
    profileId: number | null | undefined;
    /** Project surfaces pre-attach new tasks here (an `@token` still overrides). */
    defaultProjectId?: number | null;
    /** Open the detailed form carrying the parsed draft (Shift+Enter or the + button). */
    onExpand: (draft: TaskCaptureDraft) => void;
    disabled?: boolean;
    placeholder?: string;
};

/**
 * Task quick-capture bar with inline token support (see parse-task-input). The
 * typed tokens are highlighted live; Enter creates the task with everything
 * parsed, and Shift+Enter (or the leading + button — the mobile path, since
 * there's no Shift+Enter on a touch keyboard) expands into the full form with
 * the fields pre-filled. An `@name` that matches no project routes through the
 * expanded form so the user can confirm creating it.
 */
export const TaskCaptureBar = ({
    profileId,
    defaultProjectId = null,
    onExpand,
    disabled = false,
    placeholder = 'Add a task...'
}: TaskCaptureBarProps) => {
    const [value, setValue] = useState('');
    const createTask = useCreateTask();
    const projectsQuery = useProjects({ profileId, includeArchived: false });
    const projects = projectsQuery.data?.projects ?? [];

    const parsed = useMemo(() => parseTaskInput(value, new Date()), [value]);

    // Enter can beat the first projects fetch, and an `@project` checked against
    // an empty list would read as unmatched, so a submit awaits the in-flight one.
    const matchProject = async (name: string): Promise<number | null> =>
        matchByName(
            projectsQuery.data?.projects ??
                (await projectsQuery.refetch({ cancelRefetch: false })).data?.projects ??
                [],
            name
        );

    // --- @project autocomplete -------------------------------------------------
    const inputRef = useRef<HTMLInputElement>(null);
    // Set right before a value update that must land the caret somewhere
    // specific (accepting a suggestion); consumed by the effect below once
    // the controlled <input>'s DOM value has actually updated.
    const pendingCaretRef = useRef<number | null>(null);
    const [caretPos, setCaretPos] = useState(0);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    // Escape hides the dropdown without touching the token; it reappears the
    // next time the query changes (i.e. the user keeps typing).
    const [dropdownDismissed, setDropdownDismissed] = useState(false);

    const activeToken = useMemo(() => findActiveAtToken(value, caretPos), [value, caretPos]);

    const matches = useMemo(() => {
        if (!activeToken) return [];
        const query = activeToken.query.toLowerCase();
        return projects.filter((p) => p.name.toLowerCase().startsWith(query));
    }, [activeToken, projects]);

    const dropdownOpen = activeToken != null && matches.length > 0 && !dropdownDismissed;

    // A new token, or a changed query within the same token, gets a fresh
    // highlight and un-dismisses any prior Escape.
    useEffect(() => {
        setHighlightedIndex(0);
        setDropdownDismissed(false);
    }, [activeToken?.start, activeToken?.query]);

    // After accepting a suggestion the value changes programmatically; restore
    // the real DOM caret position (a controlled <input> otherwise jumps it).
    useEffect(() => {
        if (pendingCaretRef.current == null) return;
        const pos = pendingCaretRef.current;
        pendingCaretRef.current = null;
        const el = inputRef.current;
        if (el) {
            el.focus();
            el.setSelectionRange(pos, pos);
        }
    }, [value]);

    const acceptProject = (project: ProjectRead) => {
        if (!activeToken) return;
        const insertion = /\s/.test(project.name) ? `@"${project.name}"` : `@${project.name}`;
        const remainder = value.slice(activeToken.end);
        // Land on a trailing space after the token so it's cleanly delimited
        // from anything typed next (and so it stops looking "active").
        const insertedText = /^\s/.test(remainder) ? insertion : `${insertion} `;
        const newValue = value.slice(0, activeToken.start) + insertedText + remainder;
        const newCaret = activeToken.start + insertion.length + 1;

        setValue(newValue);
        setCaretPos(newCaret);
        pendingCaretRef.current = newCaret;
    };

    // Removable pills for the tokens parsed so far (priority / dates / project /
    // estimate) — a mistaken token is easy to spot and clear before Enter.
    const tokenPills = useMemo<TokenPill<TaskTokenType>[]>(() => {
        const pills: TokenPill<TaskTokenType>[] = [];
        if (parsed.priority != null)
            pills.push({ type: 'priority', label: PRIORITY_LABELS[parsed.priority] ?? 'Priority' });
        if (parsed.scheduledDate)
            pills.push({
                type: 'scheduled',
                label: `Scheduled ${formatShortDate(parseLocalDate(parsed.scheduledDate))}`
            });
        if (parsed.dueDate)
            pills.push({
                type: 'due',
                label: `Due ${formatShortDate(parseLocalDate(parsed.dueDate))}`
            });
        if (parsed.projectName) pills.push({ type: 'project', label: `@${parsed.projectName}` });
        if (parsed.estimatedMinutes != null)
            pills.push({ type: 'estimate', label: `~${parsed.estimatedMinutes}m` });
        return pills;
    }, [parsed]);

    const removeToken = (type: TaskTokenType) => {
        const next = removeSegmentToken(parsed.segments, type);
        if (next === null) return;
        setValue(next);
        inputRef.current?.focus();
    };

    const buildDraft = async (): Promise<TaskCaptureDraft> => {
        const draft: TaskCaptureDraft = {
            title: parsed.cleanTitle,
            priority: parsed.priority,
            scheduledDate: parsed.scheduledDate,
            dueDate: parsed.dueDate,
            estimatedMinutes: parsed.estimatedMinutes,
            notes: parsed.notes,
            projectId: defaultProjectId
        };
        if (parsed.projectName) {
            const matched = await matchProject(parsed.projectName);
            if (matched != null) draft.projectId = matched;
            else draft.createProjectName = parsed.projectName;
        }
        return draft;
    };

    const isPending = createTask.isPending;
    const canAct = !!profileId && !disabled && !isPending;

    const expand = async () => {
        if (!canAct) return;
        onExpand(await buildDraft());
        setValue('');
    };

    const create = async () => {
        if (!canAct || !profileId) return;
        const title = parsed.cleanTitle;
        if (!title) return;

        // An unmatched @project can't be created silently — hand off to the
        // expanded form's inline "create project?" confirmation instead.
        const matchedProjectId = parsed.projectName ? await matchProject(parsed.projectName) : null;
        if (parsed.projectName && matchedProjectId == null) {
            expand();
            return;
        }

        const data: TaskCreate = { profile_id: profileId, title };
        if (parsed.priority != null) data.priority = parsed.priority;
        if (parsed.notes) data.notes = parsed.notes;
        if (parsed.estimatedMinutes != null) data.estimated_effort = parsed.estimatedMinutes;
        if (parsed.dueDate) data.due_date = parsed.dueDate;
        if (parsed.scheduledDate) {
            data.scheduled_date = parsed.scheduledDate;
            // Scheduled data only sticks on Scheduled tasks (see the editor).
            data.status = TaskStatus.SCHEDULED;
        }
        const projectId = parsed.projectName ? matchedProjectId : defaultProjectId;
        if (projectId != null) data.project_id = projectId;

        createTask.mutate(data, {
            onSuccess: () => {
                toast.success('Task created');
                setValue('');
            },
            onError: () => toast.error('Failed to add task. Please try again.')
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // While the @project dropdown is open, arrows/Enter/Escape drive it
        // instead of their usual capture-bar behavior (submit, caret move).
        if (dropdownOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                setHighlightedIndex((i) => (i + 1) % matches.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setHighlightedIndex((i) => (i - 1 + matches.length) % matches.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const chosen = matches[highlightedIndex] ?? matches[0];
                if (chosen) acceptProject(chosen);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setDropdownDismissed(true);
                return;
            }
        }

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
                {/* The 44px coarse box stays: it matches the height the `task` field
                    tier already gives the input beside it, so this is not what makes
                    the bar tall on a phone — the input is. */}
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
                <div className='relative min-w-0 flex-1'>
                    <HighlightedInput
                        value={value}
                        segments={parsed.segments}
                        tokenColors={TASK_TOKEN_COLORS}
                        onChange={setValue}
                        onKeyDown={handleKeyDown}
                        onCaretChange={setCaretPos}
                        placeholder={placeholder}
                        disabled={disabled || isPending}
                        ariaLabel='Add a task'
                        inputRef={inputRef}
                    />
                    {dropdownOpen && (
                        <ProjectAutocomplete
                            items={matches}
                            highlightedIndex={highlightedIndex}
                            onHover={setHighlightedIndex}
                            onSelect={acceptProject}
                        />
                    )}
                </div>
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
