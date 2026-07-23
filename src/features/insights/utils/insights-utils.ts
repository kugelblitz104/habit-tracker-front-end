/**
 * Client-side bucketing + aggregation for the Insights dashboard. The task and
 * time-entry list endpoints have no date-range filter and the time summary has
 * no per-day/week split, so we page the lists and bucket them here. All date
 * math is local-time (not fixed ms) so bucket boundaries stay put across DST.
 */

export type RangeDays = 7 | 30 | 90;

export type Bucket = {
    /** ISO (local) date of the bucket's start — a stable key. */
    key: string;
    /** Short display label (weekday for daily, "Mon D" for weekly). */
    label: string;
    /** Inclusive start, local midnight. */
    start: Date;
    /** Exclusive end (start of the next bucket), local midnight. */
    end: Date;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date): string =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Local-midnight start of the day containing `d`. */
export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d: Date, n: number): Date =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * Start of the week containing `d` (local midnight), honoring the per-profile
 * week-start preference. Generalizes the Monday-only `(getDay()+6)%7` math that
 * lives inline in `project-analytics.ts`.
 */
export const startOfWeek = (d: Date, weekStartMonday: boolean): Date => {
    const x = startOfDay(d);
    const day = x.getDay(); // 0 = Sunday … 6 = Saturday
    const offset = weekStartMonday ? (day + 6) % 7 : day;
    x.setDate(x.getDate() - offset);
    return x;
};

const dayLabel = (d: Date): string => d.toLocaleDateString(undefined, { weekday: 'short' });
const weekLabel = (d: Date): string =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * Buckets spanning the last `rangeDays` days ending today (inclusive).
 * 7d → 7 daily buckets; 30/90d → weekly buckets (week-start honored). Weekly
 * ranges snap to the containing week, so the leading bucket may reach slightly
 * before the exact window start — intentional, so weeks render whole.
 */
export const buildBuckets = (
    rangeDays: RangeDays,
    weekStartMonday: boolean,
    now: Date
): Bucket[] => {
    const today = startOfDay(now);

    if (rangeDays === 7) {
        const buckets: Bucket[] = [];
        for (let i = rangeDays - 1; i >= 0; i--) {
            const start = addDays(today, -i);
            const end = addDays(start, 1);
            buckets.push({ key: isoDate(start), label: dayLabel(start), start, end });
        }
        return buckets;
    }

    const windowStart = addDays(today, -(rangeDays - 1));
    const lastWeekStart = startOfWeek(today, weekStartMonday);
    const buckets: Bucket[] = [];
    let ws = startOfWeek(windowStart, weekStartMonday);
    while (ws.getTime() <= lastWeekStart.getTime()) {
        const end = addDays(ws, 7);
        buckets.push({ key: isoDate(ws), label: weekLabel(ws), start: ws, end });
        ws = end;
    }
    return buckets;
};

/** Index of the bucket a date falls into, or -1 if outside every bucket. */
const bucketIndex = (date: Date, buckets: Bucket[]): number => {
    const t = date.getTime();
    for (let i = 0; i < buckets.length; i++) {
        if (t >= buckets[i]!.start.getTime() && t < buckets[i]!.end.getTime()) return i;
    }
    return -1;
};

/**
 * Sum items into their buckets. `dateAccessor` returns the item's Date (or null
 * to skip it); `valueAccessor` returns the amount to add (default 1 = a count).
 * Returns a per-bucket totals array aligned to `buckets`.
 */
export const bucketBy = <T>(
    items: T[],
    buckets: Bucket[],
    dateAccessor: (item: T) => Date | null,
    valueAccessor: (item: T) => number = () => 1
): number[] => {
    const totals = new Array<number>(buckets.length).fill(0);
    for (const item of items) {
        const d = dateAccessor(item);
        if (!d) continue;
        const idx = bucketIndex(d, buckets);
        if (idx >= 0) totals[idx]! += valueAccessor(item);
    }
    return totals;
};
