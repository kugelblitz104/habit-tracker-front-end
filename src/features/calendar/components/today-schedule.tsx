import type { CalendarEventRead } from '@/api';
import { useCalendarConnections } from '@/features/calendar/api/get-calendar-connections';
import { useCalendarEvents } from '@/features/calendar/api/get-calendar-events';
import {
    DAY_PRESETS,
    useScheduleWindowDays
} from '@/features/calendar/hooks/use-schedule-window-days';
import { useHiddenCalendars } from '@/features/calendar/hooks/use-hidden-calendars';
import { groupUpcomingEvents } from '@/features/calendar/utils/group-upcoming-events';
import { useAuth } from '@/lib/auth-context';
import { getBrowserTimeZone, parseLocalDate, toLocalDateString } from '@/lib/date-utils';
import { CalendarDays } from 'lucide-react';

// The panel lives on the Today page, so the upcoming list can't grow
// unbounded: show at most this many upcoming rows, then a "+n more" line.
const UPCOMING_EVENT_CAP = 10;

/**
 * Compact wall-clock label: "9:00" for AM, "2:30p" for PM. Offset-bearing ISO
 * strings are absolute instants, so browser-local rendering is correct.
 */
const formatEventTime = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours12}:${minutes}${hours24 >= 12 ? 'p' : ''}`;
};

/**
 * Compact day header for the upcoming subsection, e.g. "FRI · JUL 11".
 * `event_date` is a plain YYYY-MM-DD in the user's tz — parse it as LOCAL time
 * (new Date('YYYY-MM-DD') would parse as UTC and shift the day).
 */
const formatUpcomingDayLabel = (dateStr: string): string => {
    const date = parseLocalDate(dateStr);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${weekday} · ${monthDay}`.toUpperCase();
};

const EventRow = ({ event }: { event: CalendarEventRead }) => {
    return (
        <div
            className='flex items-center gap-3.5 rounded-[11px] px-4 py-3'
            style={{
                backgroundColor: '#1a1712',
                border: '1px solid rgba(255,255,255,.05)',
                borderLeft: `3px solid ${event.color}`
            }}
        >
            <div className='w-[54px] flex-none text-right font-mono'>
                {event.all_day ? (
                    <div className='text-[10.5px]' style={{ color: '#8a8177' }}>
                        all day
                    </div>
                ) : (
                    <>
                        <div className='text-[13px] font-medium' style={{ color: '#d7cec2' }}>
                            {formatEventTime(event.start)}
                        </div>
                        {event.end && (
                            <div className='text-[10.5px]' style={{ color: '#6f685e' }}>
                                {formatEventTime(event.end)}
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className='min-w-0 flex-1'>
                <div className='text-[15px] font-medium' style={{ color: '#e7dccb' }}>
                    {event.title}
                </div>
                {event.location && (
                    <div className='mt-[3px] text-[12px]' style={{ color: '#8a8177' }}>
                        {event.location}
                    </div>
                )}
            </div>
            <span
                className='inline-flex flex-none items-center gap-1.5 text-[11.5px]'
                style={{ color: '#9a938a' }}
            >
                <span className='h-2 w-2 rounded-[2px]' style={{ backgroundColor: event.color }} />
                {event.calendar_name}
            </span>
        </div>
    );
};

/**
 * Read-only "Today's schedule" section: the active profile's ICS calendar
 * events for today, with a per-connection legend that doubles as show/hide
 * checkboxes (view-side, persisted per profile), plus a quieter "Upcoming"
 * subsection for the next 7 days grouped by day. Lavender header is
 * deliberate — the calendar is its own cool accent, distinct from bands.
 * Hidden entirely when the profile has calendars disabled; dimmed via
 * `opacity: var(--quiet)`.
 */
export const TodaySchedule = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;
    // Require the profile RECORD to be loaded before treating calendars as
    // enabled — a not-yet-hydrated profile must not fire outbound feed fetches.
    const calendarEnabled = activeProfile != null && activeProfile.calendar_enabled !== false;

    // The USER's today + timezone, not the server's. Computed fresh each
    // render: it's stable within a view, and because targetDate/tz are part of
    // the query key, any re-render after midnight naturally fetches the new day
    // (the 15-min refetchInterval alone would otherwise keep serving the old key).
    const targetDate = toLocalDateString(new Date());
    const tz = getBrowserTimeZone();

    // How many days ahead to show (persisted per browser).
    const { windowDays, changeWindow } = useScheduleWindowDays();

    const connectionsQuery = useCalendarConnections({
        profileId,
        queryConfig: { enabled: !!profileId && calendarEnabled }
    });
    const connections = connectionsQuery.data?.calendar_connections ?? [];
    const enabledConnections = connections.filter((connection) => connection.enabled !== false);
    const hasEnabledConnections = enabledConnections.length > 0;

    // View-side calendar visibility: the legend acts as checkboxes so a shared
    // calendar (e.g. a partner's) can be hidden from this view without touching
    // its Settings on/off state. Persisted per profile.
    const { hiddenIds, toggleHidden } = useHiddenCalendars(profileId);

    const eventsQuery = useCalendarEvents({
        profileId,
        targetDate,
        days: windowDays,
        tz,
        queryConfig: {
            enabled: !!profileId && calendarEnabled && hasEnabledConnections
        }
    });
    const events = eventsQuery.data?.events ?? [];
    const errors = eventsQuery.data?.errors ?? [];

    // Drop events from calendars the user has hidden in the legend.
    const visibleEvents = events.filter((event) => !hiddenIds.has(event.connection_id));

    // Split on event_date as plain YYYY-MM-DD strings — both come from the
    // same tz, and string comparison avoids any Date round-trip day shifts.
    const todayEvents = visibleEvents.filter((event) => event.event_date === targetDate);
    const upcomingEvents = visibleEvents.filter((event) => event.event_date > targetDate);

    // Group upcoming events by day and cap the total rows shown (truncating
    // mid-day if needed). The server orders by event_date (all-day first
    // within each day), so contiguous runs are complete day groups.
    const { days: visibleUpcomingDays, hiddenCount: hiddenUpcomingCount } = groupUpcomingEvents(
        upcomingEvents,
        UPCOMING_EVENT_CAP
    );

    // Per-profile feature toggle: calendars off (or profile not loaded yet)
    // → no section at all.
    if (!calendarEnabled) return null;

    // No flash while the connections list loads.
    if (connectionsQuery.isLoading) return null;

    return (
        <section className='mb-[30px] transition-opacity' style={{ opacity: 'var(--quiet)' }}>
            <div className='mb-[13px] flex flex-wrap items-center gap-3'>
                {/* Same header treatment as the sibling band/habit sections
                    (BandSection / TodayHabitsPanel); only the lavender color differs. */}
                <h2
                    className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em]'
                    style={{ color: '#a29bcf' }}
                >
                    Today&apos;s schedule
                </h2>
                <span className='font-mono text-[10px]' style={{ color: '#615c72' }}>
                    read-only
                </span>
                <span
                    className='flex items-center gap-0.5 rounded-chip border p-0.5'
                    style={{ borderColor: 'var(--surface-input-border)' }}
                >
                    {DAY_PRESETS.map((preset) => {
                        const selected = preset.days === windowDays;
                        return (
                            <button
                                key={preset.days}
                                type='button'
                                onClick={() => changeWindow(preset.days)}
                                aria-pressed={selected}
                                className='rounded-chip px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors'
                                style={{
                                    backgroundColor: selected
                                        ? 'rgba(255,255,255,.06)'
                                        : 'transparent',
                                    color: selected ? '#a29bcf' : 'var(--color-text-muted)'
                                }}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </span>
                <span className='flex-1' />
                {enabledConnections.map((connection) => {
                    const hidden = hiddenIds.has(connection.id);
                    return (
                        <button
                            key={connection.id}
                            type='button'
                            onClick={() => toggleHidden(connection.id)}
                            aria-pressed={!hidden}
                            title={hidden ? 'Show this calendar' : 'Hide this calendar'}
                            className='inline-flex items-center gap-1.5 text-[11px] transition-opacity'
                            style={{ color: '#8f8aa0', opacity: hidden ? 0.45 : 1 }}
                        >
                            <span
                                className='h-2.5 w-2.5 rounded-[3px]'
                                style={{
                                    backgroundColor: hidden ? 'transparent' : connection.color,
                                    border: `1.5px solid ${connection.color}`
                                }}
                            />
                            <span style={{ textDecoration: hidden ? 'line-through' : 'none' }}>
                                {connection.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {!hasEnabledConnections ? (
                <div
                    className='flex items-center gap-2 rounded-row border border-dashed px-4 py-6 font-mono text-[12px] text-text-faint'
                    style={{ borderColor: 'var(--surface-card-border)' }}
                >
                    <CalendarDays size={16} className='text-text-faint' />
                    {connections.length === 0
                        ? "Connect a calendar in Settings to see today's events."
                        : 'All calendars are turned off in Settings.'}
                </div>
            ) : eventsQuery.isError ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    Couldn&apos;t load today&apos;s schedule.
                </p>
            ) : eventsQuery.isLoading ? null : visibleEvents.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    {events.length > 0
                        ? 'All shown calendars are hidden.'
                        : windowDays === 1
                        ? 'No events today.'
                        : 'No events in this range.'}
                </p>
            ) : (
                <>
                    {todayEvents.length === 0 ? (
                        <p className='font-mono text-[12px] text-text-faint'>No events today.</p>
                    ) : (
                        <div className='flex flex-col gap-[7px]'>
                            {todayEvents.map((event, index) => (
                                <EventRow
                                    key={`${event.connection_id}-${event.start}-${index}`}
                                    event={event}
                                />
                            ))}
                        </div>
                    )}
                    {upcomingEvents.length > 0 && (
                        // Quieter than today's list — today is the focus.
                        <div className='mt-[18px]' style={{ opacity: 0.75 }}>
                            <div
                                className='mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]'
                                style={{ color: '#6f685e' }}
                            >
                                Upcoming
                            </div>
                            <div className='flex flex-col gap-[13px]'>
                                {visibleUpcomingDays.map((day) => (
                                    <div key={day.date}>
                                        <div
                                            className='mb-[6px] font-mono text-[10px] uppercase tracking-[0.16em]'
                                            style={{ color: '#8a8177' }}
                                        >
                                            {formatUpcomingDayLabel(day.date)}
                                        </div>
                                        <div className='flex flex-col gap-[7px]'>
                                            {day.events.map((event, index) => (
                                                <EventRow
                                                    key={`${event.connection_id}-${event.start}-${index}`}
                                                    event={event}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {hiddenUpcomingCount > 0 && (
                                <p
                                    className='mt-2 font-mono text-[10.5px]'
                                    style={{ color: '#6f685e' }}
                                >
                                    +{hiddenUpcomingCount} more
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            {errors.length > 0 && (
                <p
                    className='mt-2 font-mono text-[10.5px]'
                    style={{ color: 'var(--color-danger)', opacity: 0.65 }}
                >
                    Couldn&apos;t refresh: {errors.join(' · ')}
                </p>
            )}
        </section>
    );
};
