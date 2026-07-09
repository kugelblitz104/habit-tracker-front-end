import { CalendarDays } from 'lucide-react';

/**
 * Placeholder for the read-only calendar. Phase 4 owns ICS fetch + rendering;
 * this is only a clearly-marked stub. Dimmed via `opacity: var(--quiet)`.
 */
export const TodaySchedule = () => {
    return (
        <section className='mb-[30px]' style={{ opacity: 'var(--quiet)' }}>
            <h2 className='mb-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-whenever-label'>
                Today&apos;s schedule
            </h2>
            {/* TODO(Phase 4): calendar events */}
            <div
                className='flex items-center gap-2 rounded-row border border-dashed px-4 py-6 font-mono text-[12px] text-text-faint'
                style={{ borderColor: 'var(--surface-card-border)' }}
            >
                <CalendarDays size={16} className='text-text-faint' />
                Connect a calendar in Settings to see today&apos;s events.
            </div>
        </section>
    );
};
