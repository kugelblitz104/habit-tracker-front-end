/**
 * Clock control for the e2e suite.
 *
 * ## What is frozen, and why
 *
 * The UI reads the clock in roughly forty places, and `useNow` re-renders every
 * 60 seconds — so countdown labels, habit day columns and the Today header can
 * all mutate *during* a test, letting a two-step assertion straddle a tick.
 * `page.clock.setFixedTime()` pins `Date.now()`/`new Date()` while leaving
 * `setTimeout`/`setInterval` running, so React Query retries, debounces and
 * toast auto-dismiss all still work. That is exactly the property we want:
 * no drift, but nothing else stubbed out.
 *
 * ## Why "now", not a fixed calendar date
 *
 * Freezing the browser to some fixed date in the past would desynchronise it
 * from the backend, which we cannot freeze:
 *
 *  - Task bands come from `compute_band` on the API container's clock, and the
 *    tasks router injects no `today` and accepts no `tz`.
 *  - Habit KPIs and streaks are server-computed against `resolve_today(tz)`.
 *
 * With the browser pinned to 2026-03-15 but the server on the real date, a
 * seeded streak would render as broken and bands would disagree with the chips
 * beside them. So the anchor is the real instant the test started, held still
 * for the test's duration, and every fixture date is expressed as an offset from
 * it. That keeps client and server in agreement while still removing drift.
 *
 * The one thing this does not give is a stable *time of day* between runs, so
 * no e2e assertion may depend on one (e.g. a countdown due at 17:30 today would
 * read "5h 30m" or "2h 10m" depending on when you ran it). Time-of-day maths is
 * covered exhaustively at the unit layer instead, where `getCountdown` takes an
 * injectable `now` — see `src/features/tasks/utils/countdown.test.ts`.
 *
 * `timezoneId` is pinned to UTC in `playwright.config.ts`, so the local-date
 * helpers below agree with the API container.
 */

const DAY_MS = 86_400_000;

/** The anchor instant for one test. Captured once, then held via `setFixedTime`. */
export const anchorNow = (): Date => new Date();

/** `YYYY-MM-DD` for `date`, in UTC (the pinned browser timezone). */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * `YYYY-MM-DD`, `days` from the anchor. Negative reaches into the past.
 * Every fixture date goes through here so nothing is ever hard-coded to a
 * calendar date that would age.
 */
export const dayFrom = (anchor: Date, days: number): string =>
    isoDate(new Date(anchor.getTime() + days * DAY_MS));

/**
 * A naive `YYYY-MM-DDTHH:MM:SS` stamp, `days` from the anchor at a fixed time of
 * day. Naive and with no offset on purpose: FastAPI serializes datetimes without
 * a timezone designator, and `parseServerDate` appends `Z` on the way back in —
 * so a fixture that wrote an offset here would skew every elapsed calculation.
 */
export const stampFrom = (anchor: Date, days: number, time = '09:00:00'): string =>
    `${dayFrom(anchor, days)}T${time}`;
