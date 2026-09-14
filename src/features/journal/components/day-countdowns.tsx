import { useCountdownCategories } from '@/features/countdowns/api/get-countdown-categories';
import { useCountdowns } from '@/features/countdowns/api/get-countdowns';
import { countdownOccursOn } from '@/features/countdowns/utils/countdown';
import { formatCompactTime } from '@/features/tasks/utils/task-format';
import { DayRow, DaySection } from './day-section';

type DayCountdownsProps = {
    profileId: number | null | undefined;
    /** The local day, `YYYY-MM-DD`. */
    date: string;
};

/**
 * The countdowns that landed on this day.
 *
 * Both lists are read, live and archived: a countdown is usually archived once
 * it has passed, so a day read back would otherwise lose the very events it
 * was about.
 */
export const DayCountdowns = ({ profileId, date }: DayCountdownsProps) => {
    const live = useCountdowns({ profileId });
    const archived = useCountdowns({ profileId, archived: true });
    const categories = useCountdownCategories({ profileId });

    const rows = [...(live.data?.countdowns ?? []), ...(archived.data?.countdowns ?? [])]
        .filter((countdown) => countdownOccursOn(countdown.target_date, countdown.repeat, date))
        .sort((a, b) => (a.target_time ?? '').localeCompare(b.target_time ?? ''));

    const colors = new Map(
        (categories.data?.categories ?? []).map((category) => [category.id, category.color])
    );

    return (
        <DaySection
            title='Countdowns'
            meta={rows.length > 0 ? String(rows.length) : null}
            isLoading={live.isLoading || archived.isLoading || categories.isLoading}
            isError={live.isError || archived.isError || categories.isError}
            errorMessage='Failed to load the countdowns for this day.'
            emptyMessage='Nothing was counting down to this day.'
            isEmpty={rows.length === 0}
        >
            {rows.map((countdown) => (
                <DayRow
                    key={countdown.id}
                    dotColor={
                        (countdown.category_id ? colors.get(countdown.category_id) : null) ??
                        undefined
                    }
                    title={countdown.title}
                    trailing={formatCompactTime(countdown.target_time)}
                />
            ))}
        </DaySection>
    );
};
