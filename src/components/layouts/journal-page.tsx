import { PageShell } from '@/components/layouts/page-shell';
import { Button } from '@/components/ui/buttons/button';
import { QueryState } from '@/components/ui/query-state';
import { CARD_SURFACE_CLASS, CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { useJournalEntry } from '@/features/journal/api/get-journal-entry';
import { useUpsertJournalEntry } from '@/features/journal/api/upsert-journal-entry';
import { DayCompletedTasks } from '@/features/journal/components/day-completed-tasks';
import { DayCountdowns } from '@/features/journal/components/day-countdowns';
import { DayCreatedTasks } from '@/features/journal/components/day-created-tasks';
import { DayHabits } from '@/features/journal/components/day-habits';
import { DayNavigator } from '@/features/journal/components/day-navigator';
import { DayQualityPicker } from '@/features/journal/components/day-quality-picker';
import { DayTimeLog } from '@/features/journal/components/day-time-log';
import { JournalEditor } from '@/features/journal/components/journal-editor';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { apiErrorMessage } from '@/lib/api-error-message';
import { useAuth } from '@/lib/auth-context';
import { isValidDay, toLocalDateString } from '@/lib/date-utils';
import { useNow } from '@/lib/use-now';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

const GRATITUDE_PROMPT = "Something you're grateful for?";

/** Asked when the profile has set no prompt of its own. There is exactly one
 *  question per box, so this is a heading and never a placeholder. */
const DEFAULT_BODY_PROMPT = 'How did today go?';

/** How long "Saved" stays on screen after a successful save. */
const SAVED_NOTICE_MS = 5_000;

const cardClass = `${CARD_SURFACE_CLASS} p-4 sm:p-5`;

const isDirty = (draft: string | undefined, stored: string | null): boolean =>
    draft !== undefined && (draft.trim() || null) !== (stored || null);

/**
 * The three writable fields of a day, always carried together.
 *
 * `PUT /journal/{entry_date}` **replaces the whole day**: a field omitted from
 * the body is a field cleared in the database. So a save that only touches the
 * body must still send the current gratitude and day quality, or it silently
 * wipes them. `payload` below is the only thing that builds a body, and it
 * cannot omit a field.
 */
type DayFields = {
    body: string | null;
    gratitude: string | null;
    day_quality: string | null;
};

/**
 * Whitespace-only prose is nothing written. The server applies the same rule
 * (`trimmed_or_none`), so normalising here keeps the client's idea of "has
 * prose" identical to the server's.
 */
const trimmedOrNull = (value: string | null | undefined): string | null => value?.trim() || null;

/**
 * The journal day view: one day's prose, its gratitude answer, its quality
 * word, and the tasks that were actually closed that day.
 *
 * The day is a `?date=` search parameter rather than a second route, so a day
 * is linkable and survives a refresh without adding a route the nav never
 * points at. An absent or malformed value falls back to today.
 *
 * The entry query keeps the previous day's data on screen while the next day
 * loads. That is a trap as well as a fix: during that window `stored` is the
 * wrong day's, so `editingDisabled` locks the editors and `save` refuses,
 * which is the only thing stopping yesterday's prose being written to today.
 */
export const JournalDayPage = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    // A minute tick, so a tab left open across midnight rolls over to the new
    // day instead of silently editing yesterday.
    const today = toLocalDateString(useNow());

    const requested = searchParams.get('date');
    const date = isValidDay(requested) ? requested! : today;

    const entryQuery = useJournalEntry({ profileId: activeProfileId, date });
    // A 404 is an unwritten day, not an error: the API layer resolves it to
    // null and the editors render empty.
    const entry = entryQuery.data ?? null;
    // The day's stored state. An unwritten day (the API's 404) is three nulls.
    const stored: DayFields = {
        body: entry?.body ?? null,
        gratitude: entry?.gratitude ?? null,
        day_quality: entry?.day_quality ?? null
    };
    // The query holds the previous day on screen while the next one loads, so
    // what is rendered right now belongs to the day we just left. Writing it
    // back would save it to `date`, which is the new day, so nothing may be
    // edited or saved until the real entry lands.
    const showingPreviousDay = entryQuery.isPlaceholderData;

    const [bodyDraft, setBodyDraft] = useState<string>();
    const [gratitudeDraft, setGratitudeDraft] = useState<string>();
    const [qualityDraft, setQualityDraft] = useState<string | null>();
    useEffect(() => {
        setBodyDraft(undefined);
        setGratitudeDraft(undefined);
        setQualityDraft(undefined);
    }, [date, activeProfileId]);

    const body = bodyDraft ?? stored.body ?? '';
    const gratitude = gratitudeDraft ?? stored.gratitude ?? '';
    const quality = qualityDraft !== undefined ? qualityDraft : stored.day_quality;

    // When the last save succeeded, or null once the receipt has expired.
    const [savedAt, setSavedAt] = useState<number | null>(null);
    useEffect(() => {
        if (savedAt === null) return;
        const timer = setTimeout(() => setSavedAt(null), SAVED_NOTICE_MS);
        return () => clearTimeout(timer);
    }, [savedAt]);

    const upsert = useUpsertJournalEntry({
        mutationConfig: {
            // Drops the previous save's receipt, so a save that then fails
            // cannot leave "Saved" on screen beside the error toast.
            onMutate: () => setSavedAt(null),
            onSuccess: () => setSavedAt(Date.now()),
            onError: (error) => {
                toast.error(apiErrorMessage(error, 'Failed to save the entry'));
            }
        }
    });

    // Everything the day holds right now: server state with the user's
    // unsaved edits layered on. Saving one field still sends all three.
    const current: DayFields = { body, gratitude, day_quality: quality };

    /**
     * Saves the whole day. `patch` is the one field this save is about: set to
     * `null` it clears that field on purpose, absent it keeps its current
     * value. Everything else goes along for the ride, because the endpoint
     * replaces the day rather than merging into it.
     */
    const save = (patch: Partial<DayFields>) => {
        if (!activeProfileId || showingPreviousDay) return;
        const merged = { ...current, ...patch };
        upsert.mutate({
            date,
            data: {
                profile_id: activeProfileId,
                body: trimmedOrNull(merged.body),
                gratitude: trimmedOrNull(merged.gratitude),
                day_quality: merged.day_quality
            }
        });
    };

    // `save` closes over the drafts, so it is a new function on every
    // keystroke. The picker is memoised and needs a callback whose identity
    // never changes, so it calls the latest `save` through a ref instead.
    const saveRef = useRef(save);
    saveRef.current = save;
    const handleQualityChange = useCallback((next: string | null) => {
        setQualityDraft(next);
        saveRef.current({ day_quality: next });
    }, []);

    const dirty = isDirty(bodyDraft, stored.body) || isDirty(gratitudeDraft, stored.gratitude);
    // A day nobody has touched says nothing at all. An edit made while the
    // previous save is settling outranks the receipt for that save: the field
    // on screen is the newer fact.
    const status = upsert.isPending
        ? 'Saving…'
        : dirty
          ? 'Unsaved changes'
          : savedAt !== null
            ? 'Saved'
            : null;

    /** Throws away every unsaved edit and shows the server's day again. */
    const discard = () => {
        setBodyDraft(undefined);
        setGratitudeDraft(undefined);
        setQualityDraft(undefined);
    };

    const editingDisabled = !activeProfileId || showingPreviousDay;

    // Opening one of the day's completed tasks. On a wide screen it fills the
    // right-hand pane so the entry stays on screen and in the same scroll
    // position; a narrow screen has no room for a pane, so `selectEdit`
    // navigates to the full-page detail instead, stashing `/journal?date=` so
    // its back link returns to this day rather than to today.
    const { isWide, selectedEditTaskId, editIntent, selectEdit, closeEdit } = useTaskDetailPane();
    const showPane = isWide && selectedEditTaskId !== null;

    // Read after mount, never during render: the server has no Notification
    // API and a first-render read would not match the hydrated markup.
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    useEffect(() => {
        if ('Notification' in window) setPermission(Notification.permission);
    }, []);
    const canAskForNotifications = permission === 'default' && !!activeProfile?.journal_prompt_time;

    // The journal is opt-in, and its nav tab is hidden when off, so the route
    // bounces rather than showing a surface with nothing behind it.
    if (activeProfile && activeProfile.journal_enabled !== true) {
        return <Navigate to='/' replace />;
    }

    const goToDay = (next: string) => {
        // Today is the default day, so it needs no parameter; that keeps
        // `/journal` a stable link that always means "today".
        setSearchParams(next === today ? {} : { date: next }, { replace: true });
    };

    return (
        <PageShell
            isWide={isWide}
            showPane={showPane}
            pane={
                <TaskDetailPane
                    taskId={selectedEditTaskId}
                    onClose={closeEdit}
                    defaultEditing={editIntent}
                />
            }
        >
            {/* Capped and centred on its own: this is a reading and writing
                column, and full-width prose across a 1080px page is hard to
                track. With the pane open the content track is already about
                that width, so the column fills it instead, which is what puts
                the entry beside the task rather than a band of empty page. */}
            <div className={showPane ? 'w-full' : 'mx-auto w-full max-w-[760px]'}>
                <DayNavigator date={date} today={today} onNavigate={goToDay}>
                    {canAskForNotifications && (
                        <Button
                            variant='icon'
                            onClick={() => {
                                Notification.requestPermission()
                                    .then(setPermission)
                                    .catch(() => {});
                            }}
                            title='Allow desktop notifications for the reminder time'
                        >
                            <Bell size={14} />
                            <span>Reminders</span>
                        </Button>
                    )}
                </DayNavigator>

                <QueryState
                    isError={entryQuery.isError}
                    isLoading={entryQuery.isLoading}
                    errorMessage='Failed to load this entry.'
                    loadingMessage='Loading…'
                    size='md'
                    className='mb-4'
                />

                <div className='flex flex-col gap-4'>
                    <section className={cardClass} style={CARD_SURFACE_STYLE}>
                        <JournalEditor
                            id='journal-body'
                            prompt={activeProfile?.journal_prompt?.trim() || DEFAULT_BODY_PROMPT}
                            value={body}
                            onChange={setBodyDraft}
                            onCommit={() => {
                                if (isDirty(bodyDraft, stored.body)) save({ body });
                            }}
                            disabled={editingDisabled}
                        />

                        {activeProfile?.journal_gratitude_enabled !== false && (
                            <div className='mt-5'>
                                <JournalEditor
                                    id='journal-gratitude'
                                    prompt={GRATITUDE_PROMPT}
                                    value={gratitude}
                                    onChange={setGratitudeDraft}
                                    onCommit={() => {
                                        if (isDirty(gratitudeDraft, stored.gratitude))
                                            save({ gratitude });
                                    }}
                                    rows={3}
                                    disabled={editingDisabled}
                                />
                            </div>
                        )}

                        {/* The row keeps its height whether or not it has
                                anything in it, so a status appearing or a save
                                settling never moves the card below. */}
                        <div className='mt-3 flex min-h-[36px] items-center justify-between gap-3 pointer-coarse:min-h-[44px]'>
                            <span
                                aria-live='polite'
                                className='font-mono text-[11px] text-text-faint'
                                style={dirty ? { color: 'var(--color-now-accent)' } : undefined}
                            >
                                {status}
                            </span>
                            <div className='flex items-center gap-2'>
                                {dirty && (
                                    <Button
                                        variant='ghost'
                                        // Keeps focus in the editor, so the
                                        // blur-commit below does not save
                                        // the very edit this button exists
                                        // to throw away.
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={discard}
                                        disabled={upsert.isPending}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                {/* Blur already commits; this is for anyone
                                        who wants to see the save happen, and
                                        for a keyboard user who never leaves the
                                        field. */}
                                <Button
                                    variant={dirty ? 'primary' : 'ghost'}
                                    onClick={() => save({ body, gratitude })}
                                    disabled={!dirty || upsert.isPending}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section className={cardClass} style={CARD_SURFACE_STYLE}>
                        <DayQualityPicker
                            value={quality}
                            onChange={handleQualityChange}
                            disabled={!activeProfileId}
                            busy={showingPreviousDay}
                        />
                    </section>

                    {/* One card, not five: this is the day's record read as a
                        whole, and five floating cards would make five
                        unrelated things out of it. Two columns once there is
                        room, because stacking every section turns a glance
                        into a scroll. */}
                    <section
                        className={`${cardClass} grid gap-6 sm:grid-cols-2`}
                        style={CARD_SURFACE_STYLE}
                    >
                        <DayCompletedTasks
                            profileId={activeProfileId}
                            date={date}
                            onSelectTask={selectEdit}
                            selectedTaskId={selectedEditTaskId}
                        />
                        <DayCreatedTasks
                            profileId={activeProfileId}
                            date={date}
                            onSelectTask={selectEdit}
                            selectedTaskId={selectedEditTaskId}
                        />
                        <DayHabits profileId={activeProfileId} date={date} />
                        <DayTimeLog profileId={activeProfileId} date={date} />
                        <DayCountdowns profileId={activeProfileId} date={date} />
                    </section>
                </div>
            </div>
        </PageShell>
    );
};
